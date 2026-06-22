import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSessionCode } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspace_id: string }> }
) {
  try {
    // A partir do Next.js 15+, os params são uma Promise que deve ser resolvida
    const { workspace_id } = await params;
    
    // Extrai os searchParams da URL acessada
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const utm_source = searchParams.get('utm_source');
    const utm_medium = searchParams.get('utm_medium');
    const utm_campaign = searchParams.get('utm_campaign');
    const fbclid = searchParams.get('fbclid');
    const gclid = searchParams.get('gclid');
    const phone = searchParams.get('phone');

    // Validação mínima de segurança
    if (!phone) {
      return new NextResponse('O parâmetro "phone" é obrigatório na URL para o redirecionamento.', { status: 400 });
    }

    // 1. Gera o código único da sessão (ex: ABC-1234)
    const session_code = generateSessionCode();

    // 2. Grava a sessão no Supabase de forma imediata
    const { error } = await supabaseAdmin
      .from('click_sessions')
      .insert([
        {
          workspace_id,
          utm_source,
          utm_medium,
          utm_campaign,
          fbclid,
          gclid,
          session_code
        }
      ]);

    if (error) {
      console.error('Redirector Error: Falha ao registrar a sessão no banco', error);
      // Opcional: mesmo com falha no banco, podemos deixar o redirecionamento seguir para não travar a jornada do cliente.
    }

    // 3. Monta a URL do WhatsApp de forma limpa e com encode correto para evitar quebra de espaços/caracteres especiais
    const rawMessage = `Olá, vi o anúncio e tenho interesse! [${session_code}]`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(rawMessage)}`;

    // 4. O Gran Finale: Redirecionamento instantâneo (HTTP 307 Temporary Redirect por padrão no Next)
    return NextResponse.redirect(whatsappUrl);
    
  } catch (error) {
    console.error('Redirector Critical Error:', error);
    return new NextResponse('Erro interno no servidor ao tentar processar o redirecionamento.', { status: 500 });
  }
}
