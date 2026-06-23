import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { 
  Users, 
  Trophy, 
  BarChart3, 
  Phone, 
  Flag, 
  Megaphone, 
  CalendarDays,
  Inbox,
  Building2,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import DashboardCharts from './components/DashboardCharts';

export const dynamic = 'force-dynamic';

function getStatusBadge(status: string) {
  switch (status) {
    case 'COMPROU':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">COMPROU</span>;
    case 'EM NEGOCIAÇÃO':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">EM NEGOCIAÇÃO</span>;
    case 'CURIOSO':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">CURIOSO</span>;
    case 'NOVO':
    default:
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">NOVO</span>;
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  let activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;

  // Fallback: se não tiver cookie, pega o primeiro workspace do banco
  if (!activeWorkspaceId) {
    const { data: firstWorkspace } = await supabaseAdmin.from('workspaces').select('id').limit(1).single();
    if (firstWorkspace) {
      activeWorkspaceId = firstWorkspace.id;
    }
  }

  // Se mesmo assim não tiver workspace (banco vazio), mostra estado vazio
  if (!activeWorkspaceId) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-5 border border-slate-200">
          <Building2 className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Nenhum cliente cadastrado</h3>
        <p className="mt-2 text-base text-slate-500 max-w-md">
          Acesse a aba Clientes para criar o seu primeiro Workspace.
        </p>
      </div>
    );
  }

  const { data: leads, error } = await supabaseAdmin
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
    .eq('workspace_id', activeWorkspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar leads:', error);
    return (
      <div className="flex items-center justify-center p-12 min-h-[60vh]">
        <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-xl shadow-sm text-center">
          <h2 className="font-bold text-lg mb-2">Erro de Conexão</h2>
          <p>Ocorreu um erro ao carregar os dados. Verifique os logs do servidor.</p>
        </div>
      </div>
    );
  }

  // Cálculos para os Cards
  const totalLeads = leads?.length || 0;
  const totalSales = leads?.filter((l) => l.status === 'COMPROU').length || 0;
  const conversionRate = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : '0.0';

  // Buscar receita dos contacts (sale_value)
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
  } catch {
    // coluna pode não existir ainda
  }

  return (
    <div className="py-8 px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Visão Geral</h1>
        <p className="mt-1 text-sm text-slate-500">Métricas de conversão, leads e tráfego deste cliente.</p>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Leads */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leads</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{totalLeads}</p>
            </div>
            <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Vendas Fechadas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{totalSales}</p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Taxa de Conversão */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversão</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{conversionRate}%</p>
            </div>
            <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Receita Total */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">
                {totalRevenue > 0 ? `R$${totalRevenue.toLocaleString('pt-BR')}` : 'R$0'}
              </p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 5: Ticket Médio */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Médio</p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {avgTicket > 0 ? `R$${avgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'R$0'}
              </p>
            </div>
            <div className="w-11 h-11 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Visuais */}
      <DashboardCharts leads={leads || []} />

      {/* Table Section */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Pipeline de Leads</h3>
        </div>
        
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-400" /> Data
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" /> Telefone
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status Semântico
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-slate-400" /> Origem
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-slate-400" /> Campanha
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {leads.map((lead: any) => {
                  const session = lead.click_sessions || {};
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors duration-200 group">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-slate-500">
                        {new Date(lead.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {lead.phone_number}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600">
                        {session.utm_source ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                            {session.utm_source}
                          </span>
                        ) : <span className="text-slate-300 font-medium">-</span>}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600">
                        {session.utm_campaign ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 truncate max-w-[200px]">
                            {session.utm_campaign}
                          </span>
                        ) : <span className="text-slate-300 font-medium">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-5 border border-slate-100">
              <Inbox className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Sem leads neste cliente</h3>
            <p className="mt-2 text-base text-slate-500 max-w-md">
              Os leads processados pela inteligência aparecerão aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
