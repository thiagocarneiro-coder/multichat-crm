import { getUser } from '@/lib/supabase-server';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getUser();

  return (
    <SettingsClient
      userEmail={user?.email || ''}
      userName={user?.user_metadata?.full_name || ''}
    />
  );
}
