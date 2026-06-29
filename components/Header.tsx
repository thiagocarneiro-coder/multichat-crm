'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import LogoutButton from './LogoutButton';

export default function Header() {
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
        setUserRole(profile.role);
      }
    };
    fetchUser();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">MultiChat</h2>
      </div>
      <div className="flex items-center gap-4">
        {userName && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
            </div>
          </div>
        )}
        <div className="w-px h-8 bg-slate-200" />
        <LogoutButton />
      </div>
    </header>
  );
}
