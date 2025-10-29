import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const email = "admin@backcenter.com";
  const password = "1q2w3e4r";

  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  // If user already exists, treat as success.
  if (error && !String(error.message).toLowerCase().includes("already")) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: data?.user ?? null });
}