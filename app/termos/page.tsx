import Link from 'next/link';
import { Target, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Termos de Uso | Riguetto Tracker',
  description: 'Termos de uso da plataforma Riguetto Tracker.',
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">Riguetto Tracker</span>
        </div>

        <h1 className="text-3xl font-black mb-2">Termos de Uso</h1>
        <p className="text-sm text-slate-500 mb-10">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma Riguetto Tracker (&quot;Plataforma&quot;), você concorda com estes Termos de Uso. 
              Caso não concorde com algum dos termos aqui dispostos, não utilize a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">2. Descrição do Serviço</h2>
            <p>
              O Riguetto Tracker é uma plataforma SaaS que permite rastrear a origem de leads recebidos via WhatsApp, 
              classificar conversas automaticamente com inteligência artificial e visualizar métricas de conversão 
              em um dashboard em tempo real.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">3. Cadastro e Conta</h2>
            <p>
              Para utilizar a Plataforma, é necessário criar uma conta com informações verdadeiras e mantê-las atualizadas. 
              Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades 
              realizadas em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">4. Planos e Pagamentos</h2>
            <p>
              A Plataforma oferece planos de assinatura mensal com funcionalidades e limites distintos. 
              Os pagamentos são processados de forma segura pela Stripe. Ao contratar um plano, você autoriza 
              a cobrança recorrente mensal no método de pagamento informado.
            </p>
            <p>
              Você pode cancelar sua assinatura a qualquer momento pelo dashboard. O acesso permanece ativo até 
              o final do período já pago.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">5. Uso Aceitável</h2>
            <p>Você se compromete a:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Utilizar a Plataforma apenas para fins lícitos</li>
              <li>Não enviar spam ou mensagens em massa não solicitadas</li>
              <li>Não utilizar a Plataforma para atividades ilegais ou fraudulentas</li>
              <li>Respeitar os termos de uso do WhatsApp e das plataformas de anúncio integradas</li>
              <li>Não tentar acessar dados de outros usuários da Plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, design, código e funcionalidades da Plataforma são de propriedade exclusiva 
              do Riguetto Tracker. Os dados inseridos pelo usuário permanecem de propriedade do usuário.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">7. Limitação de Responsabilidade</h2>
            <p>
              A Plataforma é fornecida &quot;como está&quot;. Não garantimos disponibilidade ininterrupta do serviço. 
              Não nos responsabilizamos por perdas decorrentes de indisponibilidade temporária, falhas de terceiros 
              (WhatsApp, Meta, Google) ou uso inadequado da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">8. Rescisão</h2>
            <p>
              Reservamo-nos o direito de suspender ou encerrar sua conta caso haja violação destes Termos, 
              sem necessidade de aviso prévio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">9. Alterações</h2>
            <p>
              Estes Termos podem ser atualizados a qualquer momento. Notificaremos sobre alterações significativas 
              por email ou pela Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">10. Contato</h2>
            <p>
              Em caso de dúvidas sobre estes Termos, entre em contato pelo WhatsApp:{' '}
              <a href="https://wa.me/553182324668" className="text-blue-400 hover:text-blue-300">(31) 8232-4668</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
