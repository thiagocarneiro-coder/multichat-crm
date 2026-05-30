(function() {
  // Configurações principais do Tracker
  const WORKSPACE_ID = '65a86e56-9fc8-4a43-a328-c7d43f4fd18b';
  // IMPORTANTE: Em produção, mude localhost para a URL real do seu SaaS (ex: https://app.seusaas.com/api/...)
  const API_ENDPOINT = 'http://localhost:3000/api/tracking/create-session';
  const DEFAULT_WHATSAPP_MESSAGE = 'Olá, vim pelo anúncio!';

  /**
   * Extrai os parâmetros de rastreamento da URL atual.
   */
  function getTrackingParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      fbclid: urlParams.get('fbclid'),
      gclid: urlParams.get('gclid'),
    };
  }

  /**
   * Verifica se há pelo menos um parâmetro válido para iniciarmos o rastreamento.
   */
  function hasAnyTrackingParam(params) {
    return Object.values(params).some(value => value !== null && value.trim() !== '');
  }

  /**
   * Atualiza todos os links do WhatsApp na página, injetando o código da sessão.
   */
  function updateWhatsAppLinks(sessionCode) {
    // Seleciona todos os links que apontam para o WhatsApp (wa.me ou api.whatsapp.com)
    const links = document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    
    links.forEach(link => {
      try {
        // O navegador já converte link.href para uma URL absoluta baseada na página
        const url = new URL(link.href);
        
        // Pega a mensagem atual ou usa a mensagem padrão
        let text = url.searchParams.get('text') || DEFAULT_WHATSAPP_MESSAGE;
        
        // Evita injetar o código duas vezes caso o script rode novamente
        if (!text.includes(`[${sessionCode}]`)) {
          text = `${text} [${sessionCode}]`;
          url.searchParams.set('text', text);
          
          // Atualiza o href do elemento
          link.href = url.toString();
        }
      } catch (e) {
        console.error('Tracker SaaS: Erro ao modificar link do WhatsApp', e);
      }
    });
  }

  /**
   * Função principal de inicialização.
   */
  async function initTracking() {
    const params = getTrackingParams();
    
    // Se não chegou via anúncio (sem parâmetros), não faz nada
    if (!hasAnyTrackingParam(params)) {
      return; 
    }

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: WORKSPACE_ID,
          ...params
        })
      });

      if (!response.ok) {
        throw new Error(`A API respondeu com status ${response.status}`);
      }

      const data = await response.json();
      
      // Se a API devolver o código, injetamos nos botões
      if (data.session_code) {
        updateWhatsAppLinks(data.session_code);
      }
    } catch (error) {
      console.error('Tracker SaaS: Falha ao registrar a sessão de clique', error);
    }
  }

  // Executa o script assim que a página estiver interativa (ou imediatamente se já estiver)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracking);
  } else {
    initTracking();
  }
})();
