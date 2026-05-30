import { Users, Construction } from 'lucide-react';

export default function LeadsPage() {
  return (
    <div className="py-8 px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestão de Leads</h1>
        <p className="mt-1 text-sm text-slate-500">Visualize e gerencie todos os leads capturados pelas suas campanhas.</p>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <Construction className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Página em Construção</h2>
        <p className="text-slate-500 max-w-md">
          A interface completa de Gestão de Leads com filtros avançados, exportação em CSV e edição de status está sendo desenvolvida. Em breve estará disponível!
        </p>
      </div>
    </div>
  );
}
