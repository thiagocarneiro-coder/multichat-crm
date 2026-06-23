import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <SettingsClient 
      userEmail={user.email || ''} 
      userName={user.user_metadata?.full_name || ''}
      planName={null}
      subscriptionId={null}
    />
  );
}
