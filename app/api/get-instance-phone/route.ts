import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic'; // Evita cache agressivo

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug não fornecido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('workspaces') 
      .select('phone')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Destino não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ phone: data.phone }, { status: 200 });

  } catch (error) {
    console.error('Erro fatal na API get-instance-phone:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
