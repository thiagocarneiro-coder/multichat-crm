'use client';

import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardCharts({ leads }: { leads: any[] }) {
  const { sourceData, statusData } = useMemo(() => {
    if (!leads || leads.length === 0) return { sourceData: [], statusData: [] };

    // Processar Origens (utm_source)
    const sourceMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {
      'VENDA_FECHADA': 0,
      'NEGOCIACAO': 0,
      'DUVIDA': 0,
      'NOVO': 0
    };

    leads.forEach(lead => {
      // Conta status
      if (statusMap[lead.status] !== undefined) {
        statusMap[lead.status]++;
      } else {
        statusMap['NOVO'] = (statusMap['NOVO'] || 0) + 1;
      }

      // Conta origem
      const source = lead.click_sessions?.utm_source || 'Direto/Desconhecido';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });

    const parsedSourceData = Object.keys(sourceMap).map(key => ({
      name: key,
      value: sourceMap[key]
    })).sort((a, b) => b.value - a.value); // Ordena maior pro menor

    const parsedStatusData = [
      { name: 'Vendas', count: statusMap['VENDA_FECHADA'], fill: '#10b981' }, // emerald-500
      { name: 'Negociação', count: statusMap['NEGOCIACAO'], fill: '#f59e0b' }, // amber-500
      { name: 'Dúvida', count: statusMap['DUVIDA'], fill: '#3b82f6' }, // blue-500
      { name: 'Novo', count: statusMap['NOVO'], fill: '#94a3b8' } // slate-400
    ];

    return { sourceData: parsedSourceData, statusData: parsedStatusData };
  }, [leads]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

  if (!leads || leads.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-8">
      {/* Gráfico 1: Origem de Tráfego (PieChart) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Origem de Tráfego</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#334155', fontWeight: 600 }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Funil de Status (BarChart) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Funil de Leads</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={statusData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
