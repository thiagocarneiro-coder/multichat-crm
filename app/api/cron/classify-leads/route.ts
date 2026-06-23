import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateCronRequest } from '@/lib/auth';
import { analyzeLeadFull } from '@/lib/ai';
import { sendMetaPurchase } from '@/lib/meta-capi';
import { sendGooglePurchase } from '@/lib/google-ads';
import { fireWebhooks } from '@/lib/webhooks';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const auth = validateCronRequest(request);
    if (!auth.valid) return auth.response!;

    console.log('\n=============================================');
    console.log('🕒 Iniciando CRON Job: Classificação de Leads em Lote...');
    console.log('=============================================\n');

    // 1. Busca contatos que precisam de análise
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, phone, status, updated_at')
      .or('status.in.(NOVO,Novo,novo,CURIOSO,Curioso,curioso),status.is.null');

    if (contactsError) {
      console.error('❌ Erro ao buscar contatos:', contactsError.message);
      return NextResponse.json({ error: 'Erro ao buscar contatos' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      console.log('✅ Nenhum contato precisa de classificação.');
      return NextResponse.json({ message: 'Nenhum contato para processar' }, { status: 200 });
    }

    console.log(`📊 Encontrados ${contacts.length} contatos para processamento.`);

    let processados = 0;
    let conversoesMeta = 0;
    let conversoesGoogle = 0;

    for (const contact of contacts) {
      // Buscar últimas 15 mensagens
      const { data: messages, error: msgsError } = await supabaseAdmin
        .from('messages')
        .select('content, role, created_at')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (msgsError || !messages || messages.length === 0) continue;

      messages.reverse();

      const historico = messages.map(msg => {
        const remetente = msg.role === 'user' ? 'Cliente' : 'Agência';
        return `${remetente}: ${msg.content}`;
      }).join('\n');

      console.log(`\n🔎 Analisando: ${contact.phone} | Status: ${contact.status}`);

      // Rate limit
      if (contacts.indexOf(contact) > 0) {
        await new Promise(r => setTimeout(r, 5000));
      }

      try {
        const analysis = await analyzeLeadFull(historico);

        console.log(`🤖 Resultado: ${analysis.status} | Valor: ${analysis.sale_value ? `R$${analysis.sale_value}` : '-'} | Origem: ${analysis.detected_source || '-'}`);

        const updateData: Record<string, any> = {};
        const statusChanged = analysis.status !== contact.status;
        
        if (statusChanged) updateData.status = analysis.status;
        if (analysis.sale_value) updateData.sale_value = analysis.sale_value;
        if (analysis.detected_source) updateData.detected_source = analysis.detected_source;

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('contacts')
            .update(updateData)
            .eq('id', contact.id);

          if (!updateError) {
            console.log(`✅ Atualizado:`, updateData);
            processados++;
          }
        }

        // 🔥 KILLER FEATURE: Se mudou para COMPROU, enviar conversões
        if (statusChanged && analysis.status === 'COMPROU') {
          // Meta Ads CAPI
          await sendConversionToMeta(contact.phone, analysis.sale_value);
          conversoesMeta++;

          // Google Ads via GA4
          const googleSent = await sendConversionToGoogle(contact.phone, analysis.sale_value);
          if (googleSent) conversoesGoogle++;
        }

        // 🔔 WEBHOOK: Disparar quando status mudar
        if (statusChanged) {
          // Buscar workspace_id via leads que tem esse phone
          const { data: leadData } = await supabaseAdmin
            .from('leads')
            .select('workspace_id')
            .eq('phone_number', contact.phone)
            .limit(1)
            .single();

          if (leadData?.workspace_id) {
            await fireWebhooks(leadData.workspace_id, {
              event: 'lead.status_changed',
              phone: contact.phone,
              old_status: contact.status,
              new_status: analysis.status,
              sale_value: analysis.sale_value,
              detected_source: analysis.detected_source,
              workspace_id: leadData.workspace_id,
              timestamp: new Date().toISOString(),
            });
          }
        }

      } catch (iaError) {
        console.error(`⚠️ Erro na IA para ${contact.id}:`, iaError);
      }
    }

    console.log(`\n=============================================`);
    console.log(`✅ CRON finalizado! ${processados} atualizados, ${conversoesMeta} conversões Meta, ${conversoesGoogle} conversões Google.`);
    console.log(`=============================================\n`);
    
    return NextResponse.json({ success: true, processados, conversoesMeta, conversoesGoogle, total: contacts.length });

  } catch (error) {
    console.error('❌ Erro no CRON:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * Envia a conversão para todos os workspaces que tenham Meta CAPI configurado
 * e possuam uma click_session com o mesmo telefone.
 */
async function sendConversionToMeta(phone: string, saleValue: number | null) {
  try {
    // Buscar leads com esse telefone que tenham click_session com fbclid
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select(`
        workspace_id,
        phone_number,
        click_sessions (
          fbclid,
          utm_source
        )
      `)
      .eq('phone_number', phone);

    if (!leads || leads.length === 0) return;

    for (const lead of leads) {
      // Buscar config Meta do workspace
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('meta_pixel_id, meta_access_token')
        .eq('id', lead.workspace_id)
        .single();

      if (!workspace?.meta_pixel_id || !workspace?.meta_access_token) {
        console.log(`⏭️ Workspace ${lead.workspace_id} sem Meta CAPI configurado.`);
        continue;
      }

      const clickSession = lead.click_sessions as any;
      const fbclid = clickSession?.fbclid || undefined;

      // Só enviar se a origem for Meta Ads (ou se tiver fbclid)
      const isMetaOrigin = clickSession?.utm_source?.includes('meta') || 
                           clickSession?.utm_source?.includes('facebook') ||
                           clickSession?.utm_source?.includes('instagram') ||
                           !!fbclid;

      if (!isMetaOrigin) {
        console.log(`⏭️ Lead ${phone} não veio do Meta Ads, pulando CAPI.`);
        continue;
      }

      const result = await sendMetaPurchase({
        pixelId: workspace.meta_pixel_id,
        accessToken: workspace.meta_access_token,
        phone,
        value: saleValue || undefined,
        fbclid,
      });

      if (result.success) {
        console.log(`🎯 Conversão Purchase enviada ao Meta para ${phone}!`);
      } else {
        console.error(`❌ Falha CAPI para ${phone}: ${result.error}`);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar conversão Meta:`, error);
  }
}/**
 * Envia a conversão para o Google Ads via GA4 Measurement Protocol
 * para workspaces que tenham GA4 configurado e click_session com gclid.
 */
async function sendConversionToGoogle(phone: string, saleValue: number | null): Promise<boolean> {
  try {
    // Buscar leads com esse telefone que tenham click_session com gclid
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select(`
        workspace_id,
        phone_number,
        click_sessions (
          gclid,
          utm_source
        )
      `)
      .eq('phone_number', phone);

    if (!leads || leads.length === 0) return false;

    let sent = false;
    for (const lead of leads) {
      // Buscar config Google do workspace
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('ga4_measurement_id, ga4_api_secret')
        .eq('id', lead.workspace_id)
        .single();

      if (!workspace?.ga4_measurement_id || !workspace?.ga4_api_secret) {
        console.log(`⏭️ Workspace ${lead.workspace_id} sem GA4 configurado.`);
        continue;
      }

      const clickSession = lead.click_sessions as any;
      const gclid = clickSession?.gclid || undefined;

      // Só enviar se a origem for Google (ou se tiver gclid)
      const isGoogleOrigin = clickSession?.utm_source?.includes('google') ||
                             clickSession?.utm_source === 'cpc' ||
                             !!gclid;

      if (!isGoogleOrigin) {
        console.log(`⏭️ Lead ${phone} não veio do Google Ads, pulando GA4.`);
        continue;
      }

      const result = await sendGooglePurchase({
        measurementId: workspace.ga4_measurement_id,
        apiSecret: workspace.ga4_api_secret,
        phone,
        saleValue: saleValue || undefined,
        gclid,
      });

      if (result) {
        console.log(`🎯 Conversão Purchase enviada ao Google para ${phone}!`);
        sent = true;
      }
    }
    return sent;
  } catch (error) {
    console.error(`❌ Erro ao enviar conversão Google:`, error);
    return false;
  }
}
