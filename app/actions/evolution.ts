'use server';

import { createInstance, getQRCode, checkConnectionState } from '@/lib/evolution';

export async function connectWorkspaceWhatsApp(workspaceSlug: string) {
  try {
    // 1. Tenta criar a instância (ignora se já existir)
    await createInstance(workspaceSlug);
    
    // 2. Busca o QR Code gerado
    const base64Qr = await getQRCode(workspaceSlug);
    
    return { success: true, qrcode: base64Qr };
  } catch (error: any) {
    console.error('Erro ao conectar WhatsApp:', error);
    
    // Mock para visualização caso a Evolution API não esteja configurada ou rodando localmente
    if (error.message.includes('Evolution API não configurada') || error.message.includes('fetch failed')) {
      return { 
        success: true, 
        qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Placeholder de 1 pixel (pode ser trocado por um fake real)
        isMock: true
      };
    }

    return { success: false, error: error.message };
  }
}

export async function getWorkspaceConnectionState(workspaceSlug: string) {
  try {
    const state = await checkConnectionState(workspaceSlug);
    return { success: true, state };
  } catch (error: any) {
    if (error.message.includes('Evolution API não configurada') || error.message.includes('fetch failed')) {
       return { success: true, state: 'close', isMock: true };
    }
    return { success: false, error: error.message };
  }
}
