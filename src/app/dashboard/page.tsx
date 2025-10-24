'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type RecentPqrsRow = {
  id: string
  created_at: string
  type: string
  first_name: string
  last_name: string
  email: string
  company_name: string
  branch_name: string
  message: string
}

type ChartDay = { date: string; count: number }
type ChartType = { type: string; count: number }

type Breakdown = { anonymous: number; complete: number; percent_anonymous: number; percent_complete: number }

type StatsData = {
  users: { total: number; active_today: number; registered_today: number }
  companies: { total: number }
  branches: { total: number }
  pqrs: { total: number; today: number }
  recent_pqrs: RecentPqrsRow[]
  charts?: { pqrs_by_day: ChartDay[]; pqrs_by_type: ChartType[] }
  breakdown?: Breakdown
  generated_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) {
        router.replace('/login')
        return
      }
      try {
        const res = await fetch('/api/stats')
        const json = await res.json()
        if (json?.ok) {
          setStats(json.data as StatsData)
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [router])

  const StatCard = ({ label, value, hint }: { label: string, value: string | number, hint?: string }) => (
    <div className="rounded-md border bg-card p-4 flex flex-col gap-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )

  const maxDay = Math.max(1, ...(stats?.charts?.pqrs_by_day ?? []).map((d) => d.count))
  const maxType = Math.max(1, ...(stats?.charts?.pqrs_by_type ?? []).map((t) => t.count))

  const topTypes = (stats?.charts?.pqrs_by_type ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Resumen de métricas */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Empresas" value={stats?.companies?.total ?? 0} />
          <StatCard label="Sucursales" value={stats?.branches?.total ?? 0} />
          <StatCard label="PQRS hoy" value={stats?.pqrs?.today ?? 0} hint={`Total: ${stats?.pqrs?.total ?? 0}`} />
        </div>
      )}

      {/* Gráficos */}
      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-md border bg-card">
            <div className="p-4 border-b">
              <div className="font-medium">PQRS por día (últimos 7)</div>
              <div className="text-xs text-muted-foreground">Actividad diaria</div>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-3 h-[160px]">
                {(stats?.charts?.pqrs_by_day ?? []).length > 0 ? (
                  (stats?.charts?.pqrs_by_day ?? []).map((d, i) => (
                    <div key={d.date} className="flex flex-col items-center gap-2">
                      <div 
                        className="w-8 bg-blue-600/60 min-h-[4px]" 
                        style={{ height: `${Math.max(4, Math.round((d.count / maxDay) * 120))}px` }} 
                      />
                      <div className="text-xs text-muted-foreground">
                        {new Date(d.date).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit' })}
                      </div>
                      <div className="text-xs">{d.count}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Sin datos</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-card">
            <div className="p-4 border-b">
              <div className="font-medium">PQRS por tipo</div>
              <div className="text-xs text-muted-foreground">Distribución por categoría</div>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-3 h-[160px]">
                {(stats?.charts?.pqrs_by_type ?? []).length > 0 ? (
                  (stats?.charts?.pqrs_by_type ?? []).map((t, i) => (
                    <div key={t.type} className="flex flex-col items-center gap-2">
                      <div 
                        className="w-8 bg-emerald-600/60 min-h-[4px]" 
                        style={{ height: `${Math.max(4, Math.round((t.count / maxType) * 120))}px` }} 
                      />
                      <div className="text-xs text-muted-foreground">{t.type}</div>
                      <div className="text-xs">{t.count}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Sin datos</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranking y porcentajes */}
      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-md border bg-card">
            <div className="p-4 border-b">
              <div className="font-medium">Ranking de PQRS (Top 3)</div>
              <div className="text-xs text-muted-foreground">Tipos más frecuentes</div>
            </div>
            <div className="p-4 space-y-3">
              {topTypes.map((t) => (
                <div key={t.type} className="flex items-center gap-3">
                  <div className="w-28 text-sm">{t.type}</div>
                  <div className="flex-1 h-3 rounded bg-muted relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-600/60" style={{ width: `${Math.round((t.count / maxType) * 100)}%` }} />
                  </div>
                  <div className="w-10 text-xs text-right">{t.count}</div>
                </div>
              ))}
              {topTypes.length === 0 && <div className="text-sm text-muted-foreground">Sin datos</div>}
            </div>
          </div>

          <div className="rounded-md border bg-card">
            <div className="p-4 border-b">
              <div className="font-medium">PQRS: Anónimos vs Completos</div>
              <div className="text-xs text-muted-foreground">Sobre el total de PQRS</div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-36 text-sm">Anónimos</div>
                <div className="flex-1 h-3 rounded bg-muted relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 bg-red-500/70" style={{ width: `${stats?.breakdown?.percent_anonymous ?? 0}%` }} />
                </div>
                <div className="w-14 text-xs text-right">{stats?.breakdown?.percent_anonymous ?? 0}%</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-36 text-sm">Completos</div>
                <div className="flex-1 h-3 rounded bg-muted relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 bg-blue-600/70" style={{ width: `${stats?.breakdown?.percent_complete ?? 0}%` }} />
                </div>
                <div className="w-14 text-xs text-right">{stats?.breakdown?.percent_complete ?? 0}%</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Total: {stats?.pqrs?.total ?? 0} · Anónimos: {stats?.breakdown?.anonymous ?? 0} · Completos: {stats?.breakdown?.complete ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PQRS recientes (PQRS) */}
      <div className="rounded-md border bg-card">
        <div className="p-4 border-b">
          <div className="font-medium">PQRS recientes</div>
          <div className="text-xs text-muted-foreground">Últimos PQRS registrados</div>
        </div>
        <div className="p-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats?.recent_pqrs ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                    <TableCell>{p.company_name}</TableCell>
                    <TableCell>{p.branch_name}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>{[p.first_name, p.last_name].filter(Boolean).join(' ')}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell className="max-w-[280px] truncate" title={p.message}>{p.message}</TableCell>
                  </TableRow>
                ))}
                {(!stats?.recent_pqrs || stats.recent_pqrs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">Sin registros recientes</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}