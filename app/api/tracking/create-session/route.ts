import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateSessionCode } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspace_id, utm_source, utm_medium, utm_campaign, fbclid, gclid } = body;
    
    if (!workspace_id) {
      return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 });
    }
    
    const session_code = generateSessionCode();
    
    const { data, error } = await supabase
      .from('click_sessions')
      .insert([
        {
          workspace_id,
          utm_source,
          utm_medium,
          utm_campaign,
          fbclid,
          gclid,
          session_code
        }
      ])
      .select();
      
    if (error) {
      console.error('Error inserting click session:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ session_code }, { status: 200 });
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
