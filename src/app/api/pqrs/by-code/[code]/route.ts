import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const TYPE_FROM_ABBR: Record<string, string> = {
  FE: "Felicitación",
  SU: "Sugerencia",
  SO: "Solicitud",
  PE: "Petición",
  QU: "Queja",
  RE: "Reclamo",
}

const TYPE_ABBR: Record<string, string> = {
  Felicitación: "FE",
  Sugerencia: "SU",
  Solicitud: "SO",
  Petición: "PE",
  Queja: "QU",
  Reclamo: "RE",
}

function makeCode(t: string, id: string) {
  const abbr = TYPE_ABBR[t] ?? "PQ"
  const hex = id.replace(/-/g, "")
  const num = parseInt(hex.slice(-8), 16) % 1000000
  const digits = num.toString().padStart(6, "0")
  return `${abbr}${digits}`
}

type CompanyRef = { name?: string }
type BranchRef = { name?: string }

type PqrsByCodeRow = {
  id: string
  created_at: string
  type: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  message: string
  company_id: string
  branch_id: string
  company?: CompanyRef | CompanyRef[] | null
  branch?: BranchRef | BranchRef[] | null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = await params
  const code = (resolvedParams.code || "").toUpperCase()
  if (!code || code.length < 3) {
    return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 400 })
  }
  const abbr = code.slice(0, 2)
  const type = TYPE_FROM_ABBR[abbr]
  if (!type) {
    return NextResponse.json({ ok: false, error: "Prefijo de código desconocido" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("pqrs")
    .select("id, created_at, type, first_name, last_name, email, phone, message, company_id, branch_id, company:companies(name), branch:branches(name)")
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as PqrsByCodeRow[]
  const found = rows.find((row) => makeCode(row.type, row.id) === code)
  if (!found) {
    return NextResponse.json({ ok: false, error: "Código no encontrado" }, { status: 404 })
  }

  const company_name = Array.isArray(found.company)
    ? (found.company[0]?.name ?? null)
    : found.company?.name ?? null
  const branch_name = Array.isArray(found.branch)
    ? (found.branch[0]?.name ?? null)
    : found.branch?.name ?? null

  return NextResponse.json({
    ok: true,
    data: {
      id: String(found.id),
      created_at: String(found.created_at ?? new Date().toISOString()),
      type: String(found.type ?? ""),
      first_name: String(found.first_name ?? ""),
      last_name: String(found.last_name ?? ""),
      email: String(found.email ?? ""),
      phone: found.phone ?? null,
      message: String(found.message ?? ""),
      company_id: String(found.company_id ?? ""),
      branch_id: String(found.branch_id ?? ""),
      company_name,
      branch_name,
      code,
    },
  })
}