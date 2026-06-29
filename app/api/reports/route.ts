import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/reports — MultiChat CRM
 * 
 * Retorna métricas de atendimento por período.
 * Query params:
 *   - period: 'today' | 'week' | 'month' | 'last_month'
 *   - department: 'all' | UUID do departamento
 *   - workspace_id: UUID do workspace (obrigatório)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    const departmentFilter = searchParams.get('department') || 'all';
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id é obrigatório' }, { status: 400 });
    }

    // Calcular datas do período
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    const endDate = period === 'last_month' 
      ? new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) // último dia do mês anterior
      : now;

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // ─── 1. Buscar contatos do workspace (opcionalmente filtrados por dept) ───
    let contactsQuery = supabaseAdmin
      .from('contacts')
      .select('id, department_id, assigned_user_id')
      .eq('workspace_id', workspaceId);

    if (departmentFilter !== 'all') {
      contactsQuery = contactsQuery.eq('department_id', departmentFilter);
    }

    const { data: contacts } = await contactsQuery;
    const contactIds = contacts?.map(c => c.id) || [];

    if (contactIds.length === 0) {
      return NextResponse.json({
        summary: { total_messages: 0, total_inbound: 0, total_outbound: 0, total_conversations: 0, avg_response_time_minutes: 0, active_agents: 0 },
        agents: [],
        daily_volume: []
      });
    }

    // ─── 2. Buscar mensagens no período ───
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, contact_id, role, direction, sender_id, created_at')
      .in('contact_id', contactIds)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: true });

    const allMessages = messages || [];

    // ─── 3. Buscar transferências no período ───
    const { data: transfers } = await supabaseAdmin
      .from('transfers')
      .select('id, contact_id, from_department_id, to_department_id, transferred_by, created_at')
      .in('contact_id', contactIds)
      .gte('created_at', startISO)
      .lte('created_at', endISO);

    const allTransfers = transfers || [];

    // ─── 4. Buscar perfis (atendentes) ───
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('workspace_id', workspaceId);

    const allProfiles = profiles || [];

    // ─── 5. Buscar departamentos ───
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('workspace_id', workspaceId);

    const deptMap = new Map((departments || []).map(d => [d.id, d.name]));

    // ─── CÁLCULOS ───

    // Summary
    const totalInbound = allMessages.filter(m => m.direction === 'inbound').length;
    const totalOutbound = allMessages.filter(m => m.direction === 'outbound').length;
    
    // Conversas com pelo menos 1 resposta outbound
    const conversationsWithReply = new Set(
      allMessages.filter(m => m.direction === 'outbound').map(m => m.contact_id)
    );

    // Atendentes únicos que responderam
    const activeAgentIds = new Set(
      allMessages.filter(m => m.sender_id).map(m => m.sender_id)
    );

    // Tempo médio de resposta
    // Agrupar mensagens por contato, encontrar gap entre 1ª inbound e 1ª outbound
    const contactMsgGroups = new Map<string, typeof allMessages>();
    for (const msg of allMessages) {
      const group = contactMsgGroups.get(msg.contact_id) || [];
      group.push(msg);
      contactMsgGroups.set(msg.contact_id, group);
    }

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const [, msgs] of contactMsgGroups) {
      // Para cada sequência: encontrar primeira inbound seguida de primeira outbound
      let lastInboundTime: number | null = null;
      for (const msg of msgs) {
        if (msg.direction === 'inbound' && !lastInboundTime) {
          lastInboundTime = new Date(msg.created_at).getTime();
        } else if (msg.direction === 'outbound' && lastInboundTime) {
          const responseTime = new Date(msg.created_at).getTime() - lastInboundTime;
          totalResponseTime += responseTime;
          responseCount++;
          lastInboundTime = null; // Reset para próximo ciclo
        }
      }
    }

    const avgResponseMinutes = responseCount > 0 
      ? Math.round((totalResponseTime / responseCount / 60000) * 10) / 10 
      : 0;

    // ─── Métricas por atendente ───
    const agentMetrics: Record<string, {
      messages_sent: number;
      conversations_handled: Set<string>;
      transfers_made: number;
      total_response_ms: number;
      response_count: number;
    }> = {};

    for (const msg of allMessages) {
      if (msg.sender_id && msg.direction === 'outbound') {
        if (!agentMetrics[msg.sender_id]) {
          agentMetrics[msg.sender_id] = {
            messages_sent: 0,
            conversations_handled: new Set(),
            transfers_made: 0,
            total_response_ms: 0,
            response_count: 0
          };
        }
        agentMetrics[msg.sender_id].messages_sent++;
        agentMetrics[msg.sender_id].conversations_handled.add(msg.contact_id);
      }
    }

    // Transferências por atendente
    for (const transfer of allTransfers) {
      if (transfer.transferred_by) {
        if (!agentMetrics[transfer.transferred_by]) {
          agentMetrics[transfer.transferred_by] = {
            messages_sent: 0,
            conversations_handled: new Set(),
            transfers_made: 0,
            total_response_ms: 0,
            response_count: 0
          };
        }
        agentMetrics[transfer.transferred_by].transfers_made++;
      }
    }

    // Construir array de agentes com métricas
    const agents = Object.entries(agentMetrics).map(([agentId, metrics]) => {
      const profile = allProfiles.find(p => p.id === agentId);
      return {
        id: agentId,
        name: profile?.full_name || 'Desconhecido',
        department: deptMap.get(profile?.department_id || '') || 'Sem setor',
        role: profile?.role || 'atendente',
        messages_sent: metrics.messages_sent,
        conversations_handled: metrics.conversations_handled.size,
        transfers_made: metrics.transfers_made,
      };
    }).sort((a, b) => b.messages_sent - a.messages_sent); // Ranking por msgs enviadas

    // ─── Volume diário ───
    const dailyMap = new Map<string, { inbound: number; outbound: number }>();
    
    for (const msg of allMessages) {
      const day = msg.created_at.split('T')[0]; // YYYY-MM-DD
      const entry = dailyMap.get(day) || { inbound: 0, outbound: 0 };
      if (msg.direction === 'inbound') entry.inbound++;
      else entry.outbound++;
      dailyMap.set(day, entry);
    }

    const dailyVolume = Array.from(dailyMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      summary: {
        total_messages: allMessages.length,
        total_inbound: totalInbound,
        total_outbound: totalOutbound,
        total_conversations: conversationsWithReply.size,
        avg_response_time_minutes: avgResponseMinutes,
        active_agents: activeAgentIds.size
      },
      agents,
      daily_volume: dailyVolume
    });

  } catch (error: any) {
    console.error('[Reports API] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
