'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      title="Sair"
      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all text-slate-500"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
