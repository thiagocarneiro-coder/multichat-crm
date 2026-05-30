import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Trophy, 
  BarChart3, 
  Phone, 
  Flag, 
  Megaphone, 
  CalendarDays,
  Inbox
} from 'lucide-react';
import DashboardCharts from './components/DashboardCharts';

export const dynamic = 'force-dynamic';

function getStatusBadge(status: string) {
  switch (status) {
    case 'VENDA_FECHADA':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">VENDA FECHADA</span>;
    case 'NEGOCIACAO':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">NEGOCIAÇÃO</span>;
    case 'DUVIDA':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">DÚVIDA</span>;
    case 'NOVO':
    default:
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">NOVO</span>;
  }
}

export default async function DashboardPage() {
  const { data: leads, error } = await supabase
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
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar leads:', error);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-xl shadow-sm text-center">
          <h2 className="font-bold text-lg mb-2">Erro de Conexão</h2>
          <p>Ocorreu um erro ao carregar os dados. Verifique os logs do servidor.</p>
        </div>
      </div>
    );
  }

  // Cálculos para os Cards
  const totalLeads = leads?.length || 0;
  const totalSales = leads?.filter((l) => l.status === 'VENDA_FECHADA').length || 0;
  const conversionRate = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Tracker Dashboard</h1>
          <p className="mt-2 text-base text-slate-500">Métricas de conversão, leads e tráfego em tempo real.</p>
        </div>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Leads */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total de Leads</p>
                <p className="text-4xl font-black text-slate-900 mt-2">{totalLeads}</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <Users className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Card 2: Vendas Fechadas */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Vendas Fechadas</p>
                <p className="text-4xl font-black text-slate-900 mt-2">{totalSales}</p>
              </div>
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                <Trophy className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Card 3: Taxa de Conversão */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Conversão Real</p>
                <p className="text-4xl font-black text-slate-900 mt-2">{conversionRate}%</p>
              </div>
              <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                <BarChart3 className="w-7 h-7" />
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
              <h3 className="text-xl font-bold text-slate-900">Seu Dashboard está pronto!</h3>
              <p className="mt-2 text-base text-slate-500 max-w-md">
                Você ainda não captou leads. Inicie suas campanhas ou use o Redirecionador Invisível para ver a mágica acontecendo em tempo real aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
