import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const search = searchParams.get("search") ?? "";
  const companyId = searchParams.get("companyId") ?? undefined;
  const activeParam = searchParams.get("active");
  const isActive = activeParam === null ? undefined : activeParam === "true";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("branches")
    .select("*, company:companies(id,name,logo_url)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (companyId) {
    query = query.eq("company_id", companyId);
  }
  if (isActive !== undefined) {
    query = query.eq("is_active", isActive);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data, count });
}

function generateSlug(name?: string) {
  const base = (name || "sucursal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, address, is_active = true, company_id, logo_url, slug } = body ?? {};
  if (!name || typeof name !== "string") {
    return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!company_id || typeof company_id !== "string") {
    return NextResponse.json({ ok: false, error: "Debe seleccionar la empresa" }, { status: 400 });
  }
  const slugFinal = slug && typeof slug === "string" && slug.trim() ? slug.trim() : generateSlug(name);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("branches")
    .insert({ name, address, is_active, company_id, logo_url, slug: slugFinal })
    .select("*, company:companies(id,name,logo_url)")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}