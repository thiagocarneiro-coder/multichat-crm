'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageCircle, Building2, Settings, Target } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Conversas', href: '/dashboard/conversas', icon: MessageCircle },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Building2 },
  { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
];

type SidebarProps = {
  planName?: string;
  workspaceCount?: number;
  maxWorkspaces?: number;
};

export default function Sidebar({ planName, workspaceCount = 0, maxWorkspaces = 1 }: SidebarProps) {
  const pathname = usePathname();

  const isUnlimited = maxWorkspaces === -1;
  const usagePercent = isUnlimited ? 0 : Math.min((workspaceCount / maxWorkspaces) * 100, 100);

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col text-slate-300">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          Riguetto <span className="text-blue-400">Tracker</span>
        </Link>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Menu Principal
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-2">
            Plano {planName || 'Gratuito'}
          </p>
          {!isUnlimited && (
            <>
              <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
                <div 
                  className={`h-1.5 rounded-full transition-all ${usagePercent > 80 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                {workspaceCount} / {maxWorkspaces} workspace{maxWorkspaces > 1 ? 's' : ''}
              </p>
            </>
          )}
          {isUnlimited && (
            <p className="text-[10px] text-emerald-400">
              ✨ {workspaceCount} workspace{workspaceCount !== 1 ? 's' : ''} · Ilimitado
            </p>
          )}
          {!planName && (
            <Link 
              href="/pricing" 
              className="block mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-medium"
            >
              Fazer upgrade →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
