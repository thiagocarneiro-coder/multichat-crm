import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  // Buscar plano e customer ID
  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('plan, stripe_customer_id')
    .eq('user_id', user.id)
    .not('plan', 'eq', 'free')
    .limit(1)
    .single();

  return (
    <SettingsClient 
      userEmail={user.email || ''} 
      userName={user.user_metadata?.full_name || ''}
      planName={workspace?.plan || null}
      stripeCustomerId={workspace?.stripe_customer_id || null}
    />
  );
}
