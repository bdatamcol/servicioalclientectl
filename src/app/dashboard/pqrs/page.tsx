'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { Reply, Filter, ChevronLeft, ChevronRight, Mail, Clock, CheckCircle, XCircle, Paperclip, Eye } from 'lucide-react'

interface EmpresaOpt { id: string; name: string }
interface SucursalOpt { id: string; name: string; company_id: string }
interface PqrsItem {
  id: string
  branch_id: string
  company_id: string
  type: string
  message: string
  first_name: string
  middle_name: string | null
  last_name: string
  second_last_name: string | null
  email: string
  phone: string | null
  national_id: string | null
  created_at: string
  code?: string
}

interface ResponseItem {
  id: string;
  sent_at: string;
  content: string;
  content_html?: string;
  attachment_names?: string | null;
  attachment_sizes?: string | null;
  responder_email?: string | null;
  responder_name?: string | null;
  status?: string;
  error_message?: string | null;
  to_email?: string;
  cc_emails?: string | null;
  bcc_emails?: string | null;
  subject?: string;
  has_attachments?: boolean;
  attachment_count?: number;
  cc_count?: number;
  bcc_count?: number;
  content_preview?: string;
  is_recent?: boolean;
  retry_count?: number;
  email_message_id?: string | null;
  created_at: string;
}

const TYPES = ['Queja', 'Reclamo', 'Solicitud', 'Felicitación', 'Petición', 'Sugerencia']

export default function PqrsDashboardPage() {
  const [items, setItems] = useState<PqrsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [companyId, setCompanyId] = useState<string>('')
  const [branchId, setBranchId] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [companies, setCompanies] = useState<EmpresaOpt[]>([])
  const [branches, setBranches] = useState<SucursalOpt[]>([])

  const [openView, setOpenView] = useState(false)
  const [viewItem, setViewItem] = useState<PqrsItem | null>(null)
  const [viewTab, setViewTab] = useState<'detalle' | 'respuestas'>('detalle')
  const [responses, setResponses] = useState<ResponseItem[]>([])

  // Estados para la funcionalidad mejorada de respuestas
  const [responsesLoading, setResponsesLoading] = useState(false)
  const [responsesError, setResponsesError] = useState<string | null>(null)
  const [responsesPage, setResponsesPage] = useState(1)
  const [responsesLimit] = useState(10)
  const [responsesTotalPages, setResponsesTotalPages] = useState(1)
  const [responsesFilters, setResponsesFilters] = useState({
    status: '',
    responder_email: '',
    date_from: '',
    date_to: '',
    search: ''
  })
  const [showResponsesFilters, setShowResponsesFilters] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null)
  const [showResponseDetail, setShowResponseDetail] = useState(false)
  const [responsesSummary, setResponsesSummary] = useState({
    total_responses: 0,
    successful_sends: 0,
    failed_sends: 0,
    pending_sends: 0
  })

  const [openReply, setOpenReply] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)

  const [statuses, setStatuses] = useState<Record<string, 'Respondido' | 'Sin responder'>>({})
  const [statusFilter, setStatusFilter] = useState<string>('')

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  // Función para cargar respuestas con filtros y paginación
  const loadResponses = async (pqrsId: string, resetPage = false) => {
    if (resetPage) setResponsesPage(1)
    
    setResponsesLoading(true)
    setResponsesError(null)
    
    try {
      const params = new URLSearchParams({
        pqrsId: pqrsId,
        page: String(resetPage ? 1 : responsesPage),
        pageSize: String(responsesLimit)
      })

      const response = await fetch(`/api/pqrs/responses?${params.toString()}`)
      const json = await response.json()

      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'Error al cargar respuestas')
      }

      const rows = (json.data || []) as Array<{
        id: string
        pqrs_id: string
        response_text?: string | null
        status?: string | null
        sent_at?: string | null
        created_at?: string | null
        sent_by?: string | null
        attachment_count?: number | null
        error_message?: string | null
        retry_count?: number | null
      }>

      const mapped: ResponseItem[] = rows.map((row) => ({
        id: row.id,
        sent_at: row.sent_at || '',
        content: row.response_text || '',
        responder_email: row.sent_by || null,
        responder_name: row.sent_by || null,
        status: row.status || undefined,
        error_message: row.error_message || null,
        subject: undefined,
        has_attachments: (row.attachment_count ?? 0) > 0,
        attachment_count: row.attachment_count ?? 0,
        content_preview: row.response_text ? row.response_text.substring(0, 100) + '...' : '',
        retry_count: row.retry_count ?? undefined,
        created_at: row.created_at || row.sent_at || new Date().toISOString()
      }))

      setResponses(mapped)

      const summary = rows.reduce(
        (acc, row) => {
          acc.total_responses += 1
          switch (row.status) {
            case 'sent':
              acc.successful_sends += 1
              break
            case 'failed':
              acc.failed_sends += 1
              break
            case 'pending':
              acc.pending_sends += 1
              break
          }
          return acc
        },
        {
          total_responses: 0,
          successful_sends: 0,
          failed_sends: 0,
          pending_sends: 0
        }
      )

      setResponsesSummary(summary)
      setResponsesTotalPages(json.pagination?.totalPages || 1)
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar respuestas'
      setResponsesError(message)
      setResponses([])
    } finally {
      setResponsesLoading(false)
    }
  }

  useEffect(() => {
    const loadRefs = async () => {
      const cParams = new URLSearchParams({ page: '1', pageSize: '200' })
      const bParams = new URLSearchParams({ page: '1', pageSize: '500' })
      const [cRes, bRes] = await Promise.all([
        fetch(`/api/empresas?${cParams.toString()}`),
        fetch(`/api/sucursales?${bParams.toString()}`),
      ])
      const [cJson, bJson] = await Promise.all([cRes.json(), bRes.json()])
      if (cJson.ok) setCompanies(((cJson.data ?? []) as Array<{ id: string; name: string }>).map((c) => ({ id: c.id, name: c.name })))
      if (bJson.ok) setBranches(((bJson.data ?? []) as Array<{ id: string; name: string; company_id: string }>).map((b) => ({ id: b.id, name: b.name, company_id: b.company_id })))
    }
    loadRefs()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (companyId) params.set('companyId', companyId)
    if (branchId) params.set('branchId', branchId)
    if (type) params.set('type', type)

    const res = await fetch(`/api/pqrs?${params.toString()}`)
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      setError(json.error || 'Error al cargar datos')
      return
    }
    
    // Filtrar por código generado dinámicamente si la búsqueda no encontró resultados en el servidor
    let filteredData = json.data || []
    if (search && filteredData.length === 0) {
      // Realizar una búsqueda sin filtro de texto para obtener todos los datos
      const allParams = new URLSearchParams({ page: '1', pageSize: '1000' })
      if (companyId) allParams.set('companyId', companyId)
      if (branchId) allParams.set('branchId', branchId)
      if (type) allParams.set('type', type)
      
      const allRes = await fetch(`/api/pqrs?${allParams.toString()}`)
      const allJson = await allRes.json()
      
      if (allJson.ok) {
        // Filtrar por código en el frontend
        filteredData = (allJson.data || []).filter((item: PqrsItem) => 
          item.code?.toLowerCase().includes(search.toLowerCase())
        )
        setTotal(filteredData.length)
        
        // Aplicar paginación manual
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        filteredData = filteredData.slice(startIndex, endIndex)
      }
    } else {
      setTotal(json.count || 0)
    }
    
    setItems(filteredData)

    // Cargar estados para los items mostrados
    const ids = (filteredData || []).map((it: PqrsItem) => it.id)
    if (ids.length) {
      try {
        const sRes = await fetch(`/api/pqrs/responses?ids=${encodeURIComponent(ids.join(','))}`)
        const sJson = await sRes.json()
        if (sJson.ok) setStatuses(sJson.data || {})
      } catch (e) {
        // Ignorar errores de estado
      }
    } else {
      setStatuses({})
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, companyId, branchId, type])

  // derive filtered branches by company
  const branchesForCompany = useMemo(() => {
    return branches.filter((b) => !companyId || b.company_id === companyId)
  }, [branches, companyId])

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name || '-'
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || '-'

  const fullName = (it: PqrsItem) => {
    return [it.first_name, it.middle_name, it.last_name, it.second_last_name].filter(Boolean).join(' ')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder="Buscar…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} className="w-[220px]" />

          <div className="flex items-center gap-2">
            <Label>Empresa</Label>
            <Select value={companyId || '__all__'} onValueChange={(v) => { setPage(1); setCompanyId(v === '__all__' ? '' : v); setBranchId('') }}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label>Sucursal</Label>
            <Select value={branchId || '__all__'} onValueChange={(v) => { setPage(1); setBranchId(v === '__all__' ? '' : v) }}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {branchesForCompany.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label>Tipo</Label>
            <Select value={type || '__all__'} onValueChange={(v) => { setPage(1); setType(v === '__all__' ? '' : v) }}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label>Estado</Label>
            <Select value={statusFilter || '__all__'} onValueChange={(v) => { setPage(1); setStatusFilter(v === '__all__' ? '' : v) }}>
              <SelectTrigger className="w-[220px]" aria-label="Filtrar por estado"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="Respondido">Respondido</SelectItem>
                <SelectItem value="Sin responder">Sin responder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="p-3 text-sm text-muted-foreground">Mostrando: {items.length} de {total}</div>
         <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items
              .filter((it) => {
                const st = statuses[it.id] || 'Sin responder'
                if (!statusFilter) return true
                return st === statusFilter
              })
              .map((it) => (
              <TableRow key={it.id}>
                <TableCell>{new Date(it.created_at).toLocaleString()}</TableCell>
                <TableCell>{companyName(it.company_id)}</TableCell>
                <TableCell>{branchName(it.branch_id)}</TableCell>
                <TableCell>{it.type}</TableCell>
                <TableCell>{it.code ?? ''}</TableCell>
                <TableCell>{fullName(it)}</TableCell>
                <TableCell>{it.email}</TableCell>
                <TableCell>{it.phone || '-'}</TableCell>
                <TableCell>{statuses[it.id] || 'Sin responder'}</TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button variant="outline" size="sm" aria-label="Ver detalle" onClick={() => { setViewItem(it); setOpenView(true); setViewTab('detalle') }}>Ver</Button>
                  <Button variant="outline" size="sm" aria-label="Responder por correo" onClick={() => { setViewItem(it); setReplyContent(''); setReplyAttachment(null); setSendError(null); setSendSuccess(null); setOpenReply(true) }}>
                    <Reply className="mr-2 h-4 w-4" /> Responder
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">
                  {loading ? 'Cargando…' : 'Sin resultados'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Total: {total} · Página {page} de {totalPages}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</Button>
          <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Siguiente</Button>
        </div>
      </div>

      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del PQR</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex gap-2 border-b pb-2" role="tablist" aria-label="Tabs de detalle">
                <Button variant={viewTab === 'detalle' ? 'default' : 'outline'} size="sm" role="tab" aria-selected={viewTab==='detalle'} onClick={() => setViewTab('detalle')}>Detalle</Button>
                <Button variant={viewTab === 'respuestas' ? 'default' : 'outline'} size="sm" role="tab" aria-selected={viewTab==='respuestas'} onClick={async () => {
                  setViewTab('respuestas')
                  await loadResponses(viewItem.id, true)
                }}>Respuestas</Button>
              </div>

              {viewTab === 'detalle' ? (
                <div className="space-y-3" role="tabpanel" aria-label="Detalle">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Fecha</Label>
                      <div className="text-sm">{new Date(viewItem.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <div className="text-sm">{viewItem.type}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Código</Label>
                      <div className="text-sm">{viewItem.code ?? '-'}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Empresa</Label>
                      <div className="text-sm">{companyName(viewItem.company_id)}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Sucursal</Label>
                      <div className="text-sm">{branchName(viewItem.branch_id)}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Correo</Label>
                      <div className="text-sm">{viewItem.email}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Teléfono</Label>
                      <div className="text-sm">{viewItem.phone || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Cédula</Label>
                      <div className="text-sm">{viewItem.national_id || '-'}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Nombre completo</Label>
                      <div className="text-sm">{fullName(viewItem)}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Mensaje</Label>
                    <div className="text-sm whitespace-pre-wrap rounded-md border p-3 bg-muted/10">{viewItem.message}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4" role="tabpanel" aria-label="Respuestas">
                  {/* Estado de carga y errores */}
                  {responsesLoading && (
                    <div className="text-center py-3">
                      <div className="text-sm text-muted-foreground">Cargando respuestas...</div>
                    </div>
                  )}

                  {responsesError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <div className="text-sm text-destructive">{responsesError}</div>
                    </div>
                  )}

                  {/* Lista simple de respuestas sin tarjetas informativas ni filtros */}
                  {!responsesLoading && !responsesError && (
                    <>
                      {responses.length === 0 ? (
                        <div className="text-center py-6">
                          <Mail className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <div className="text-sm text-muted-foreground">Sin respuestas registradas</div>
                        </div>
                      ) : (
                          <div className="space-y-2">
                            {responses.map((response) => (
                              <div key={response.id} className="border rounded-md p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {response.status === 'sent' && <CheckCircle className="h-4 w-4 text-primary" />}
                                    {response.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                                    {response.status === 'pending' && <Clock className="h-4 w-4 text-ring" />}
                                    <span className="text-sm font-medium">
                                      {response.responder_name || response.responder_email}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {response.sent_at ? new Date(response.sent_at).toLocaleString() : 'No enviado'}
                                  </div>
                                </div>
                                <div className="text-sm whitespace-pre-wrap bg-white p-2 rounded border">
                                  {response.content || 'Sin contenido'}
                                </div>
                                {(response.error_message) && (
                                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                                    <strong>Error:</strong> {response.error_message}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Paginación */}
                        {responsesTotalPages > 1 && (
                          <div className="flex items-center justify-between pt-3">
                            <div className="text-sm text-muted-foreground">
                              Página {responsesPage} de {responsesTotalPages}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setResponsesPage(prev => Math.max(1, prev - 1))
                                  loadResponses(viewItem.id)
                                }}
                                disabled={responsesPage <= 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setResponsesPage(prev => Math.min(responsesTotalPages, prev + 1))
                                  loadResponses(viewItem.id)
                                }}
                                disabled={responsesPage >= responsesTotalPages}
                              >
                                Siguiente
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Responder */}
      <Dialog open={openReply} onOpenChange={setOpenReply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder por correo</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <form
              aria-label="Formulario de respuesta"
              onSubmit={async (e) => {
                e.preventDefault()
                setSending(true)
                setSendError(null)
                setSendSuccess(null)
                // Validación previa
                if (replyContent.trim().length < 10) {
                  setSendError('El mensaje debe tener al menos 10 caracteres')
                  setSending(false)
                  return
                }
                if (replyAttachment) {
                  const max = 5 * 1024 * 1024
                  const allowedExt = /\.(pdf|doc|docx|png|jpe?g|webp)$/i
                  if (replyAttachment.size > max) {
                    setSendError('El archivo supera el límite de 5MB')
                    setSending(false)
                    return
                  }
                  if (!allowedExt.test(replyAttachment.name)) {
                    setSendError('Tipo de archivo no permitido')
                    setSending(false)
                    return
                  }
                }
                try {
                  const { data: userData } = await supabase.auth.getUser()
                  const responderEmail = userData.user?.email || ''
                  const fd = new FormData()
                  fd.append('to_email', viewItem.email)
                  fd.append('pqrs_id', viewItem.id)
                  fd.append('content', replyContent)
                  fd.append('responder_email', responderEmail)
                  if (replyAttachment) fd.append('attachment', replyAttachment)
                  const res = await fetch('/api/pqrs/responses', { method: 'POST', body: fd })
                  const json = await res.json()
                  if (!json.ok) {
                    // Priorizar mensajes de error específicos del API
                    const errorMsg = json.data?.error_message || json.error || 'Error al enviar el correo'
                    throw new Error(errorMsg)
                  }
                  setSendSuccess('¡Respuesta enviada exitosamente!')
                  setStatuses((prev) => ({ ...prev, [viewItem.id]: 'Respondido' }))
                  setTimeout(() => { setOpenReply(false); setReplyContent(''); setReplyAttachment(null); setSendSuccess(null) }, 1200)
                } catch (err: unknown) {
                  // Mostrar errores más específicos
                  let errorMessage = 'Error desconocido al enviar el correo'
                  
                  if (err instanceof Error && err.message) {
                    errorMessage = err.message
                  } else if (typeof err === 'string') {
                    errorMessage = err
                  }
                  
                  // Agregar contexto adicional para errores comunes
                  if (errorMessage.includes('SSL') || errorMessage.includes('SMTP')) {
                    errorMessage += ' - Verifique la configuración SMTP del servidor'
                  } else if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
                    errorMessage += ' - Credenciales de correo incorrectas'
                  } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
                    errorMessage += ' - Problema de conectividad de red'
                  }
                  
                  setSendError(errorMessage)
                } finally {
                  setSending(false)
                }
              }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="emailTo" className="text-xs">Destinatario</Label>
                <Input id="emailTo" value={viewItem.email} readOnly aria-readonly="true" aria-describedby="emailHelp" />
                <p id="emailHelp" className="text-xs text-muted-foreground">Correo del remitente (no editable)</p>
              </div>
              <div>
                <Label htmlFor="replyContent" className="text-xs">Mensaje</Label>
                <Textarea id="replyContent" required minLength={10} value={replyContent} onChange={(e) => setReplyContent(e.target.value)} aria-required="true" placeholder="Escribe tu respuesta (mínimo 10 caracteres)" />
              </div>
              <div>
                <Label htmlFor="replyAttachment" className="text-xs">Adjuntar archivo (opcional)</Label>
                <Input id="replyAttachment" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setReplyAttachment(f || null)
                }} />
                <p className="text-xs text-muted-foreground">Máximo 5MB. Tipos permitidos: PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenReply(false)} disabled={sending} aria-label="Cancelar envío">Cancelar</Button>
                <Button type="submit" disabled={sending || replyContent.length < 10} aria-label="Enviar respuesta">
                  {sending ? (
                    <span className="inline-flex items-center"><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span> Enviando…</span>
                  ) : (
                    'Enviar'
                  )}
                </Button>
              </div>
              {sendError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3" role="alert">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-destructive">Error al enviar correo</h3>
                      <div className="mt-2 text-sm text-destructive">
                        <p>{sendError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {sendSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3" role="status">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{sendSuccess}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>

      {error && <p className="text-destructive text-sm" aria-live="polite">{error}</p>}
    </div>
  )
}
