'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageCircle, Users, Settings } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            setRole(data.role);
          }
        }
      } catch (err) {
        console.error('[Sidebar] Erro ao buscar papel do usuário:', err);
      }
    };

    fetchUserRole();
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Conversas', href: '/dashboard/conversas', icon: MessageCircle, show: true },
    { name: 'Atendentes', href: '/dashboard/atendentes', icon: Users, show: role === 'gerente' },
    { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, show: true },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col text-slate-300">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-white">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageCircle className="w-4.5 h-4.5 text-white" />
          </div>
          Multi<span className="text-emerald-400">Chat</span>
        </Link>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Menu Principal
        </div>
        {navItems
          .filter(item => item.show)
          .map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-sm'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            MultiChat CRM
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Triagem Multi-Setor WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}
