import Link from 'next/link';
import { 
  BarChart3, 
  Zap, 
  Brain, 
  ArrowRight, 
  Target, 
  MessageCircle, 
  TrendingUp,
  Shield,
  Sparkles,
  CheckCircle
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white overflow-hidden">
      
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[128px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Riguetto <span className="text-blue-400">Tracker</span></span>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            href="/pricing" 
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden sm:inline"
          >
            Planos
          </Link>
          <Link 
            href="/login" 
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Entrar
          </Link>
          <Link 
            href="/signup" 
            className="text-sm font-bold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-colors"
          >
            Criar conta
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 mb-8">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">Rastreamento com IA para agências de tráfego pago</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
          Saiba de onde vem{' '}
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            cada lead
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Conecte suas campanhas ao WhatsApp, classifique leads automaticamente com inteligência artificial 
          e visualize o funil completo em tempo real. Sem achismo.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/signup" 
            className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02]"
          >
            Teste grátis por 14 dias
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <span className="text-sm text-slate-500">Sem cobrança durante o período de teste. Cancele quando quiser.</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="group bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-3xl p-8 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500">
            <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <Zap className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Bridge Pages Inteligentes</h3>
            <p className="text-slate-400 leading-relaxed">
              Crie páginas-ponte que capturam UTMs automaticamente e injetam códigos de rastreamento 
              na mensagem do WhatsApp. Cada clique fica registrado.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-3xl p-8 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500">
            <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <Brain className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Classificação com IA</h3>
            <p className="text-slate-400 leading-relaxed">
              A inteligência artificial analisa o histórico de conversas e classifica cada lead 
              automaticamente no funil: Novo → Curioso → Em Negociação → Comprou.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-3xl p-8 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <BarChart3 className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Dashboard em Tempo Real</h3>
            <p className="text-slate-400 leading-relaxed">
              Visualize métricas de conversão, origem de tráfego e pipeline de leads 
              com gráficos dinâmicos. Inbox de conversas com atualização instantânea.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-32">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-16 tracking-tight">
          Como funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: Target, label: 'Campanha', desc: 'Meta Ads ou Google Ads rodam normalmente' },
            { icon: Zap, label: 'Bridge Page', desc: 'Clique redireciona e injeta código de rastreamento' },
            { icon: MessageCircle, label: 'WhatsApp', desc: 'Lead envia mensagem com código invisível' },
            { icon: TrendingUp, label: 'Dashboard', desc: 'IA classifica e você vê tudo em tempo real' },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 mx-auto bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4">
                <step.icon className="w-7 h-7 text-blue-400" />
              </div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Passo {i + 1}</div>
              <h3 className="font-bold text-lg mb-1">{step.label}</h3>
              <p className="text-sm text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-32">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-4 tracking-tight">
          Planos simples, sem surpresas
        </h2>
        <p className="text-slate-400 text-center mb-4">Escolha o plano ideal para sua agência</p>
        <p className="text-emerald-400 text-center mb-12 text-sm font-medium">✨ Todos os planos com 14 dias grátis</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Starter', price: '97', desc: 'Para freelancers', features: ['1 workspace', '100 leads/mês', 'Dashboard básico'] },
            { name: 'Pro', price: '197', desc: 'Para agências', features: ['5 workspaces', 'Leads ilimitados', 'IA classificação'], popular: true },
            { name: 'Agency', price: '397', desc: 'Para operações', features: ['Ilimitado', 'Suporte prioritário', 'White-label'] },
          ].map((plan) => (
            <div key={plan.name} className={`bg-white/[0.03] border ${plan.popular ? 'border-blue-500/30 ring-1 ring-blue-500/20' : 'border-white/[0.06]'} rounded-2xl p-6 text-center`}>
              {plan.popular && (
                <span className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full mb-4">Mais popular</span>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="text-sm text-slate-500 mb-3">{plan.desc}</p>
              <div className="mb-4">
                <span className="text-sm text-slate-400">R$</span>
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-sm text-slate-400">/mês</span>
              </div>
              <ul className="space-y-2 mb-6 text-left">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link 
                href="/pricing" 
                className={`block w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              >
                Testar 14 dias grátis
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-3xl p-10 text-center">
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium">Dados seguros</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Zap className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">Setup em 5 minutos</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium">IA Gemini integrada</span>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-4">Pronto para rastrear cada lead?</h2>
          <p className="text-slate-400 mb-8">Teste grátis por 14 dias. Sem compromisso, cancele quando quiser.</p>
          <Link 
            href="/signup" 
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-8 py-4 rounded-2xl text-lg hover:bg-slate-100 transition-colors shadow-xl"
          >
            Começar teste grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-400">Riguetto Tracker</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link href="/pricing" className="hover:text-slate-300 transition-colors">Planos</Link>
            <Link href="/termos" className="hover:text-slate-300 transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-slate-300 transition-colors">Privacidade</Link>
            <a href="https://wa.me/553182324668" target="_blank" rel="noopener" className="hover:text-slate-300 transition-colors">Contato</a>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Riguetto Tracker. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
