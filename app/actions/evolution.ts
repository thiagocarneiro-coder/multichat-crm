'use server';

import { createInstance, getQRCode, checkConnectionState } from '@/lib/evolution';

export async function connectWorkspaceWhatsApp(workspaceSlug: string) {
  try {
    const instanceName = `${workspaceSlug}-${Date.now()}`;

    // 1. Tenta criar a instância (ignora se já existir)
    await createInstance(instanceName);
    
    // 2. Busca o QR Code gerado
    const base64Qr = await getQRCode(instanceName);
    
    return { success: true, qrcode: base64Qr, instanceName };
  } catch (error: any) {
    console.error('Erro ao conectar WhatsApp:', error);
    

    return { success: false, error: error.message };
  }
}

export async function getWorkspaceConnectionState(workspaceSlug: string) {
  try {
    const state = await checkConnectionState(workspaceSlug);
    return { success: true, state };
  } catch (error: any) {

    return { success: false, error: error.message };
  }
}
