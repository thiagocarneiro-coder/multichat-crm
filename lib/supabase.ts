import { createClient } from '@supabase/supabase-js';

/**
 * ⚠️ SUPABASE ADMIN CLIENT — SERVER-SIDE ONLY
 * 
 * Uses the Service Role Key which BYPASSES all Row Level Security (RLS).
 * NEVER expose this client or its key to the browser/frontend.
 * 
 * For frontend (browser) usage, use `supabaseClient` from `@/lib/supabase-client`.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the admin client. ' +
    'Check your .env.local file.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
