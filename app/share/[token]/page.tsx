'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Trophy, BarChart3, DollarSign, TrendingUp, Eye, Lock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useParams } from 'next/navigation';

export default function SharedDashboardPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Dashboard não encontrado');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Link inválido</h1>
          <p className="text-slate-500">Este dashboard não existe ou o acesso foi revogado.</p>
        </div>
      </div>
    );
  }

  const { metrics, charts, workspace_name } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{workspace_name}</h1>
              <p className="text-xs text-slate-400">Dashboard de Performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Somente Leitura</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard label="Leads" value={metrics.totalLeads} icon={Users} color="blue" />
          <MetricCard label="Vendas" value={metrics.totalSales} icon={Trophy} color="emerald" />
          <MetricCard label="Conversão" value={`${metrics.conversionRate}%`} icon={BarChart3} color="purple" />
          <MetricCard 
            label="Receita" 
            value={metrics.totalRevenue > 0 ? `R$${metrics.totalRevenue.toLocaleString('pt-BR')}` : 'R$0'} 
            icon={DollarSign} 
            color="emerald"
            highlight 
          />
          <MetricCard 
            label="Ticket Médio" 
            value={metrics.avgTicket > 0 ? `R$${Math.round(metrics.avgTicket).toLocaleString('pt-BR')}` : 'R$0'} 
            icon={TrendingUp} 
            color="amber" 
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - Origens */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Origem de Tráfego</h3>
            <div className="h-72 w-full">
              {charts.sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.sourceData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">Sem dados</div>
              )}
            </div>
          </div>

          {/* Bar Chart - Funil */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Funil de Leads</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.statusData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {charts.statusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-bold text-slate-600">Riguetto Tracker</span> — Inteligência de vendas para WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, highlight }: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; valueColor: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', valueColor: 'text-slate-900' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', valueColor: highlight ? 'text-emerald-600' : 'text-slate-900' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', valueColor: 'text-slate-900' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', valueColor: 'text-slate-900' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl lg:text-3xl font-black mt-1 ${c.valueColor}`}>{value}</p>
        </div>
        <div className={`w-11 h-11 ${c.bg} rounded-full flex items-center justify-center ${c.text}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
