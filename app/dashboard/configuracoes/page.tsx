import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  // Buscar dados do plano
  const { data: workspaces } = await supabaseAdmin
    .from('workspaces')
    .select('stripe_plan, stripe_subscription_id')
    .eq('user_id', user.id)
    .not('stripe_plan', 'is', null)
    .limit(1)
    .single();

  return (
    <SettingsClient 
      userEmail={user.email || ''} 
      userName={user.user_metadata?.full_name || ''}
      planName={workspaces?.stripe_plan || null}
      subscriptionId={workspaces?.stripe_subscription_id || null}
    />
  );
}
