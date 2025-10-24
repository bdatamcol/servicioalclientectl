import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug) return NextResponse.json({ ok: false, error: "Slug requerido" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id,name,slug,address,logo_url,is_active,company_id, company:companies(id,name,logo_url)")
    .eq("slug", slug)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Sucursal no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data });
}