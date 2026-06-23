import Link from 'next/link';
import { Target, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidade | Riguetto Tracker',
  description: 'Política de privacidade da plataforma Riguetto Tracker.',
};

export default function PrivacidadePage() {
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

        <h1 className="text-3xl font-black mb-2">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 mb-10">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white">1. Informações que Coletamos</h2>
            <p>Ao utilizar o Riguetto Tracker, coletamos as seguintes informações:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong className="text-slate-300">Dados de cadastro:</strong> nome, email e senha (criptografada)</li>
              <li><strong className="text-slate-300">Dados de uso:</strong> interações com o dashboard, configurações de workspaces</li>
              <li><strong className="text-slate-300">Dados de leads:</strong> mensagens recebidas via WhatsApp, números de telefone, origem do tráfego (UTMs)</li>
              <li><strong className="text-slate-300">Dados de pagamento:</strong> processados diretamente pela Stripe — não armazenamos dados de cartão</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">2. Como Usamos seus Dados</h2>
            <p>Utilizamos os dados coletados para:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Fornecer e manter o serviço da Plataforma</li>
              <li>Gerar relatórios de métricas e classificação de leads</li>
              <li>Processar pagamentos e gerenciar assinaturas</li>
              <li>Enviar comunicações importantes sobre sua conta</li>
              <li>Melhorar a experiência do usuário e a Plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">3. Compartilhamento de Dados</h2>
            <p>Não vendemos, alugamos ou comercializamos seus dados pessoais. Compartilhamos dados apenas com:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong className="text-slate-300">Stripe:</strong> para processamento de pagamentos</li>
              <li><strong className="text-slate-300">Supabase:</strong> para armazenamento seguro de dados</li>
              <li><strong className="text-slate-300">Google (Gemini AI):</strong> para classificação automática de leads (dados anonimizados)</li>
              <li><strong className="text-slate-300">Autoridades legais:</strong> quando exigido por lei</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">4. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Criptografia em trânsito (HTTPS/TLS)</li>
              <li>Autenticação segura via Supabase Auth</li>
              <li>Isolamento de dados entre contas (multi-tenant)</li>
              <li>Senhas armazenadas com hash criptográfico</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">5. Retenção de Dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Ao cancelar sua conta, seus dados serão 
              excluídos em até 30 dias, exceto quando a retenção for necessária para cumprimento de obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">6. Seus Direitos (LGPD)</h2>
            <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Acessar seus dados pessoais</li>
              <li>Solicitar correção de dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar o consentimento para o tratamento de dados</li>
              <li>Solicitar a portabilidade dos dados</li>
            </ul>
            <p>
              Para exercer esses direitos, entre em contato pelo WhatsApp:{' '}
              <a href="https://wa.me/553182324668" className="text-blue-400 hover:text-blue-300">(31) 8232-4668</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">7. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para manter sua sessão de login ativa e cookies de análise 
              para melhorar a experiência na Plataforma. Você pode desativar cookies nas configurações 
              do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">8. Alterações</h2>
            <p>
              Esta Política pode ser atualizada periodicamente. Alterações significativas serão comunicadas 
              por email ou notificação na Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">9. Contato</h2>
            <p>
              Dúvidas sobre esta Política? Entre em contato pelo WhatsApp:{' '}
              <a href="https://wa.me/553182324668" className="text-blue-400 hover:text-blue-300">(31) 8232-4668</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
