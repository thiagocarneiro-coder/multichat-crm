import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/share/[token]
 * Retorna dados do dashboard público (sem autenticação).
 * Qualquer pessoa com o token pode acessar.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Buscar workspace pelo share_token
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .select('id, name')
      .eq('share_token', token)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Dashboard não encontrado' }, { status: 404 });
    }

    // Buscar leads com click_sessions
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select(`
        id,
        created_at,
        phone_number,
        status,
        click_sessions (
          utm_source,
          utm_campaign
        )
      `)
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });

    // Buscar receita dos contacts
    let totalRevenue = 0;
    let avgTicket = 0;
    try {
      const { data: salesData } = await supabaseAdmin
        .from('contacts')
        .select('sale_value')
        .not('sale_value', 'is', null)
        .gt('sale_value', 0);
      
      if (salesData && salesData.length > 0) {
        totalRevenue = salesData.reduce((sum: number, s: any) => sum + (s.sale_value || 0), 0);
        avgTicket = totalRevenue / salesData.length;
      }
    } catch {}

    const safeLeads = leads || [];
    const totalLeads = safeLeads.length;
    const totalSales = safeLeads.filter((l: any) => l.status === 'COMPROU').length;
    const conversionRate = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : '0.0';

    // Processar dados para gráficos
    const sourceMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {
      'COMPROU': 0,
      'EM NEGOCIAÇÃO': 0,
      'CURIOSO': 0,
      'NOVO': 0
    };

    safeLeads.forEach((lead: any) => {
      if (statusMap[lead.status] !== undefined) {
        statusMap[lead.status]++;
      } else {
        statusMap['NOVO']++;
      }
      const source = lead.click_sessions?.utm_source || 'Direto';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });

    const sourceData = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const statusData = [
      { name: 'Compraram', count: statusMap['COMPROU'], fill: '#10b981' },
      { name: 'Em Negociação', count: statusMap['EM NEGOCIAÇÃO'], fill: '#f59e0b' },
      { name: 'Curiosos', count: statusMap['CURIOSO'], fill: '#3b82f6' },
      { name: 'Novos', count: statusMap['NOVO'], fill: '#94a3b8' },
    ];

    return NextResponse.json({
      workspace_name: workspace.name,
      metrics: {
        totalLeads,
        totalSales,
        conversionRate,
        totalRevenue,
        avgTicket,
      },
      charts: {
        sourceData,
        statusData,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
