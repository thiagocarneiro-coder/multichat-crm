import { Settings, Construction } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="py-8 px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">Gerencie sua conta, planos e preferências globais da plataforma.</p>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
          <Construction className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Página em Construção</h2>
        <p className="text-slate-500 max-w-md">
          A aba de configurações onde você poderá alterar senhas, convidar membros da equipe e ver faturas está sendo implementada.
        </p>
      </div>
    </div>
  );
}
