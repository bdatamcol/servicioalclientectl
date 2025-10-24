import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();
  const { name, address, is_active, logo_url } = body ?? {};
  if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) update.name = name;
  if (address !== undefined) update.address = address;
  if (is_active !== undefined) update.is_active = !!is_active;
  if (logo_url !== undefined) update.logo_url = logo_url;

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });

  // Listar sucursales de la empresa
  const { data: branches, error: branchesListError } = await supabaseAdmin
    .from("branches")
    .select("id")
    .eq("company_id", id);
  if (branchesListError) {
    return NextResponse.json({ ok: false, error: branchesListError.message }, { status: 500 });
  }
  const branchIds = ((branches ?? []) as { id: string }[]).map((b) => b.id);

  // Desvincular PQRS de estas sucursales
  if (branchIds.length > 0) {
    const { error: pqrsBranchUpdateError } = await supabaseAdmin
      .from("pqrs")
      .update({ branch_id: null })
      .in("branch_id", branchIds);
    if (pqrsBranchUpdateError) {
      return NextResponse.json({ ok: false, error: pqrsBranchUpdateError.message }, { status: 500 });
    }
  }

  // Desvincular PQRS de la empresa
  const { error: pqrsCompanyUpdateError } = await supabaseAdmin
    .from("pqrs")
    .update({ company_id: null })
    .eq("company_id", id);
  if (pqrsCompanyUpdateError) {
    return NextResponse.json({ ok: false, error: pqrsCompanyUpdateError.message }, { status: 500 });
  }

  // Eliminar sucursales de la empresa
  if (branchIds.length > 0) {
    const { error: branchesDeleteError } = await supabaseAdmin
      .from("branches")
      .delete()
      .in("id", branchIds);
    if (branchesDeleteError) {
      return NextResponse.json({ ok: false, error: branchesDeleteError.message }, { status: 500 });
    }
  }

  // Eliminar la empresa
  const { error } = await supabaseAdmin.from("companies").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}