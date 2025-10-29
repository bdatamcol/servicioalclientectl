import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();
  const { name, address, is_active, company_id, logo_url, slug } = body ?? {};
  if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) update.name = name;
  if (address !== undefined) update.address = address;
  if (is_active !== undefined) update.is_active = !!is_active;
  if (company_id !== undefined) update.company_id = company_id;
  if (logo_url !== undefined) update.logo_url = logo_url;
  if (slug !== undefined) update.slug = slug;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("branches")
    .update(update)
    .eq("id", id)
    .select("*, company:companies(id,name,logo_url)")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });

  // Preservar PQRS: desvincular sucursal en todos los registros relacionados
  const { error: pqrsUpdateError } = await getSupabaseAdmin()
    .from("pqrs")
    .update({ branch_id: null })
    .eq("branch_id", id);

  if (pqrsUpdateError) {
    return NextResponse.json({ ok: false, error: pqrsUpdateError.message }, { status: 500 });
  }

  // Ahora eliminar la sucursal
  const { error } = await getSupabaseAdmin().from("branches").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}