import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * PATCH /api/contacts/:id — MultiChat CRM
 * 
 * Atualiza campos de um contato (pipeline_stage, name, notes, tags, etc.)
 * Usado pelo CRM Kanban (drag-and-drop) e pelo painel de detalhes.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Campos permitidos para atualização
    const allowedFields = ['pipeline_stage', 'name', 'notes', 'tags', 'email', 'company', 'department_id', 'assigned_user_id', 'status'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualizar' },
        { status: 400 }
      );
    }

    // Se department_id está sendo alterado, precisamos registrar a transferência
    // O trigger do banco usa auth.uid() que fica NULL com supabaseAdmin,
    // então fazemos o insert manual aqui
    let oldDepartmentId: string | null = null;
    if (updateData.department_id !== undefined) {
      // Buscar o department_id atual antes de atualizar
      const { data: currentContact } = await supabaseAdmin
        .from('contacts')
        .select('department_id')
        .eq('id', id)
        .single();
      oldDepartmentId = currentContact?.department_id || null;
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Contacts] Erro ao atualizar:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Registrar transferência manualmente (com transferred_by correto)
    if (updateData.department_id !== undefined && oldDepartmentId !== updateData.department_id) {
      const transferredBy = body.transferred_by || null;
      await supabaseAdmin.from('transfers').insert({
        contact_id: id,
        from_department_id: oldDepartmentId,
        to_department_id: updateData.department_id,
        transferred_by: transferredBy
      });
    }

    return NextResponse.json({ success: true, contact: data }, { status: 200 });

  } catch (error: any) {
    console.error('[Contacts] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/contacts/:id — MultiChat CRM
 * 
 * Retorna detalhes de um contato específico.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
