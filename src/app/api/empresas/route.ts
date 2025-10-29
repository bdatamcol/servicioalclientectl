import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const search = searchParams.get("search") ?? "";
  const activeParam = searchParams.get("active");
  const isActive = activeParam === null ? undefined : activeParam === "true";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseAdmin();
  let query = supabase.from("companies")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("name", `%${search}%`);
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, address, is_active = true, logo_url } = body ?? {};
  if (!name || typeof name !== "string") {
    return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("companies")
    .insert({ name, address, is_active, logo_url })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}