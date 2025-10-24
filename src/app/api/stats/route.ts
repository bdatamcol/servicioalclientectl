import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Tipos para PQRS en consultas específicas
type RecentPqrsRow = {
  id: string
  created_at: string
  type: string
  first_name: string
  last_name: string
  email: string
  message: string
  company?: { name?: string } | { name?: string }[] | null
  branch?: { name?: string } | { name?: string }[] | null
}

type RangePqrsRow = {
  id: string
  created_at: string
  type: string
  first_name: string
  last_name: string
  national_id: string | null
  phone: string | null
}

export async function GET(_req: NextRequest) {
  try {
    // Obtener conteos básicos de las tablas que existen
    const { count: companiesCount, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select("id", { count: "exact", head: true })
    if (companiesError) throw companiesError

    const { count: branchesCount, error: branchesError } = await supabaseAdmin
      .from("branches")
      .select("id", { count: "exact", head: true })
    if (branchesError) throw branchesError

    const { count: pqrsCount, error: pqrsError } = await supabaseAdmin
      .from("pqrs")
      .select("id", { count: "exact", head: true })
    if (pqrsError) throw pqrsError

    // PQRS de hoy
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString()

    const { count: pqrsTodayCount, error: pqrsTodayError } = await supabaseAdmin
      .from("pqrs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso)
    if (pqrsTodayError) throw pqrsTodayError

    // PQRS recientes
    const { data: recentPqrs, error: recentError } = await supabaseAdmin
      .from("pqrs")
      .select("id, created_at, type, first_name, last_name, email, message, company:companies(name), branch:branches(name)")
      .order("created_at", { ascending: false })
      .limit(5)
    if (recentError) throw recentError

    const typedRecent = (recentPqrs ?? []) as RecentPqrsRow[]
    const recentRows = typedRecent.map((p) => {
      const company_name = Array.isArray(p.company) ? (p.company[0]?.name ?? null) : p.company?.name ?? null
      const branch_name = Array.isArray(p.branch) ? (p.branch[0]?.name ?? null) : p.branch?.name ?? null
      return {
        id: String(p.id),
        created_at: String(p.created_at ?? new Date().toISOString()),
        type: String(p.type ?? ""),
        first_name: String(p.first_name ?? ""),
        last_name: String(p.last_name ?? ""),
        email: String(p.email ?? ""),
        company_name,
        branch_name,
        message: String(p.message ?? ""),
      }
    })

    // Gráficos: últimos 7 días y conteo por tipo
    const days = 7
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (days - 1))
    const startIso = start.toISOString()

    const { data: rangePqrs, error: rangeError } = await supabaseAdmin
      .from("pqrs")
      .select("id, created_at, type, first_name, last_name, national_id, phone")
      .gte("created_at", startIso)
      .order("created_at", { ascending: true })
    if (rangeError) throw rangeError

    const byDayMap: Record<string, number> = {}
    const byTypeMap: Record<string, number> = {}

    // Inicializar días en 0
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      byDayMap[key] = 0
    }

    const typedRange = (rangePqrs ?? []) as RangePqrsRow[]
    typedRange.forEach((p) => {
      const dayKey = String(p.created_at).slice(0, 10)
      if (dayKey in byDayMap) byDayMap[dayKey] = (byDayMap[dayKey] ?? 0) + 1
      const t = String(p.type ?? "")
      byTypeMap[t] = (byTypeMap[t] ?? 0) + 1
    })

    const pqrs_by_day = Object.entries(byDayMap).map(([date, count]) => ({ date, count }))
    const pqrs_by_type = Object.entries(byTypeMap).map(([type, count]) => ({ type, count }))

    // Desglose: anónimos vs completos
    const { count: anonymousCount, error: anonError } = await supabaseAdmin
      .from("pqrs")
      .select("id", { count: "exact", head: true })
      .eq("first_name", "Anónimo")
      .eq("last_name", "Anónimo")
    if (anonError) throw anonError

    const { count: completeCount, error: completeError } = await supabaseAdmin
      .from("pqrs")
      .select("id", { count: "exact", head: true })
      .neq("first_name", "Anónimo")
      .neq("last_name", "Anónimo")
    if (completeError) throw completeError

    const totalAll = pqrsCount ?? 0
    const anonCount = anonymousCount ?? 0
    const compCount = completeCount ?? 0
    
    // Asegurar que la suma no exceda el total
    const adjustedComplete = Math.min(compCount, totalAll - anonCount)
    
    const percentAnonymous = totalAll ? Math.round((anonCount / totalAll) * 100) : 0
    const percentComplete = totalAll ? Math.round((adjustedComplete / totalAll) * 100) : 0

    return NextResponse.json({
      ok: true,
      data: {
        users: { total: 0, active_today: 0, registered_today: 0 },
        companies: { total: companiesCount ?? 0 },
        branches: { total: branchesCount ?? 0 },
        pqrs: { total: pqrsCount ?? 0, today: pqrsTodayCount ?? 0 },
        recent_pqrs: recentRows,
        charts: { pqrs_by_day, pqrs_by_type },
        breakdown: {
          anonymous: anonCount,
          complete: adjustedComplete,
          percent_anonymous: percentAnonymous,
          percent_complete: percentComplete,
        },
        generated_at: new Date().toISOString(),
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}