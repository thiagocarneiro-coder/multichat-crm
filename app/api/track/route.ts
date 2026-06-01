import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspace_id, track_code, url } = body;
    
    if (!workspace_id || !track_code) {
      return NextResponse.json({ error: 'Missing workspace_id or track_code' }, { status: 400 });
    }
    
    // Registra como lead inicial 'NOVO' na tabela de leads
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          workspace_id,
          phone_number: track_code, // Temporário até vir do WhatsApp
          status: 'NOVO',
          pipeline_stage: 'bridge_page_click'
        }
      ])
      .select();
      
    if (error) {
      console.error('Error inserting lead on bridge page:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, lead: data[0] }, { status: 200 });
  } catch (error) {
    console.error('Error parsing track request body:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
