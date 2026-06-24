'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
      title="Sair"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Sair</span>
    </button>
  );
}
