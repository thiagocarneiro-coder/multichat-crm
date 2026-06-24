'use client';

import LogoutButton from './LogoutButton';

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">MultiChat CRM</h2>
      </div>
      <div className="flex items-center gap-4">
        <LogoutButton />
      </div>
    </header>
  );
}
