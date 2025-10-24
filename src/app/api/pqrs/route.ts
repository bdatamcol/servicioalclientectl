import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const TYPES = ["Queja","Reclamo","Solicitud","Felicitación","Petición","Sugerencia"] as const;

type PqrsType = typeof TYPES[number];

// Añadir abreviaciones y generador de código
const TYPE_ABBR: Record<string, string> = {
  Felicitación: "FE",
  Sugerencia: "SU",
  Solicitud: "SO",
  Petición: "PE",
  Queja: "QU",
  Reclamo: "RE",
};
function makeCode(t: string, id: string) {
  const abbr = TYPE_ABBR[t] ?? "PQ";
  const hex = id.replace(/-/g, "");
  const num = parseInt(hex.slice(-8), 16) % 1000000;
  const digits = num.toString().padStart(6, "0");
  return `${abbr}${digits}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const search = searchParams.get("search") ?? "";
  const branchId = searchParams.get("branchId") ?? undefined;
  const companyId = searchParams.get("companyId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("pqrs")
    .select("*, branch:branches(id,name,slug,logo_url), company:companies(id,name,logo_url)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (branchId) query = query.eq("branch_id", branchId);
  if (companyId) query = query.eq("company_id", companyId);
  if (type) query = query.eq("type", type);
  if (search) {
    // Búsqueda en columnas existentes de la base de datos
    const like = `%${search}%`;
    query = query.or(
      [
        `type.ilike.${like}`,
        `message.ilike.${like}`,
        `email.ilike.${like}`,
        `first_name.ilike.${like}`,
        `middle_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `second_last_name.ilike.${like}`,
        `national_id.ilike.${like}`,
        `phone.ilike.${like}`,
      ].join(",")
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  type PqrsMinimal = { id: string | number; type?: string | null; code?: string | null };
  const dataWithCode = ((data ?? []) as PqrsMinimal[]).map((row) => ({
    ...row,
    code: row.code ?? makeCode(String(row.type ?? ""), String(row.id ?? "")),
  }));
  return NextResponse.json({ ok: true, data: dataWithCode, count });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    branch_id,
    company_id,
    type,
    message,
    first_name,
    middle_name,
    last_name,
    second_last_name,
    email,
    phone,
    national_id,
  } = body ?? {};

  if (!branch_id || typeof branch_id !== "string") {
    return NextResponse.json({ ok: false, error: "Sucursal requerida" }, { status: 400 });
  }
  if (!company_id || typeof company_id !== "string") {
    return NextResponse.json({ ok: false, error: "Empresa requerida" }, { status: 400 });
  }
  if (!type || !TYPES.includes(type as PqrsType)) {
    return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }
  if (!message || typeof message !== "string") {
    return NextResponse.json({ ok: false, error: "El texto es obligatorio" }, { status: 400 });
  }
  if (!first_name || typeof first_name !== "string") {
    return NextResponse.json({ ok: false, error: "Primer nombre es obligatorio" }, { status: 400 });
  }
  if (!last_name || typeof last_name !== "string") {
    return NextResponse.json({ ok: false, error: "Primer apellido es obligatorio" }, { status: 400 });
  }
  if (!email || typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "Correo electrónico es obligatorio" }, { status: 400 });
  }

  const insert = {
    branch_id,
    company_id,
    type,
    message,
    first_name,
    middle_name,
    last_name,
    second_last_name,
    email,
    phone,
    national_id,
  };

  const { data, error } = await supabaseAdmin
    .from("pqrs")
    .insert(insert)
    .select("*, branch:branches(id,name,slug,logo_url), company:companies(id,name,logo_url)")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Generar y persistir código (si existe la columna en la BD)
  const code = makeCode(String(data.type), String(data.id));
  // Devolver el código calculado sin intentar persistirlo en la BD
  return NextResponse.json({ ok: true, data: { ...data, code } });
}