'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import QRCode from 'react-qr-code'

interface EmpresaOpt {
  id: string
  name: string
}
interface Sucursal {
  id: string
  name: string
  address: string | null
  is_active: boolean
  company_id: string
  company?: { id: string; name: string }
  created_at: string
  updated_at: string
  logo_url?: string | null
  slug?: string | null
}

export default function SucursalesPage() {
  const [items, setItems] = useState<Sucursal[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(40)
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [companyFilter, setCompanyFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<EmpresaOpt[]>([])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const fetchCompanies = async () => {
    const params = new URLSearchParams({ page: '1', pageSize: '100' })
    const res = await fetch(`/api/empresas?${params.toString()}`)
    const json = await res.json()
    if (json.ok) {
      setCompanies(((json.data ?? []) as Array<{ id: string; name: string }>).map((c) => ({ id: c.id, name: c.name })))
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (activeOnly) params.set('active', 'true')
    if (companyFilter) params.set('companyId', companyFilter)

    const res = await fetch(`/api/sucursales?${params.toString()}`)
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      setError(json.error || 'Error al cargar datos')
      return
    }
    setItems(json.data || [])
    setTotal(json.count || 0)
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, activeOnly, companyFilter])

  // Add/Edit modal state
  const [openModal, setOpenModal] = useState(false)
  const [editItem, setEditItem] = useState<Sucursal | null>(null)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formCompanyId, setFormCompanyId] = useState('')
  // removed: formLogoUrl, formSlug

  const openCreate = () => {
    setEditItem(null)
    setFormName('')
    setFormAddress('')
    setFormActive(true)
    setFormCompanyId('')
    setOpenModal(true)
  }
  const openEdit = (item: Sucursal) => {
    setEditItem(item)
    setFormName(item.name)
    setFormAddress(item.address || '')
    setFormActive(item.is_active)
    setFormCompanyId(item.company_id)
    setOpenModal(true)
  }

  const saveItem = async () => {
    const payload = {
      name: formName.trim(),
      address: formAddress.trim() || null,
      is_active: formActive,
      company_id: formCompanyId,
    }
    if (!payload.name) return setError('El nombre es obligatorio')
    if (!payload.company_id) return setError('Debe seleccionar la empresa')

    const res = await fetch(editItem ? `/api/sucursales/${editItem.id}` : '/api/sucursales', {
      method: editItem ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!json.ok) {
      return setError(json.error || 'Error al guardar')
    }
    setOpenModal(false)
    fetchData()
  }

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const confirmDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/sucursales/${deleteId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) {
      return setError(json.error || 'Error al eliminar')
    }
    setDeleteId(null)
    fetchData()
  }

  // QR Modal state
  const [qrOpen, setQrOpen] = useState(false)
  const [qrValue, setQrValue] = useState<string>('')
  const qrRef = useRef<HTMLDivElement | null>(null)

  const downloadQr = () => {
    try {
      const container = qrRef.current
      if (!container) return
      const svg = container.querySelector('svg')
      if (!svg) return
      const widthAttr = svg.getAttribute('width')
      const heightAttr = svg.getAttribute('height')
      const width = widthAttr ? Number(widthAttr) : 200
      const height = heightAttr ? Number(heightAttr) : 200
      const serializer = new XMLSerializer()
      let svgData = serializer.serializeToString(svg)
      if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      }
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        const pngData = canvas.toDataURL('image/png')
        const a = document.createElement('a')
        const nameSlug = (qrValue.split('/').pop() || 'qr').replace(/[^a-z0-9_-]/gi, '')
        a.download = `qr-${nameSlug}.png`
        a.href = pngData
        a.click()
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
      }
      img.src = url
    } catch (_e) {
      // opcional: podríamos mostrar un error de descarga
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Input placeholder="Buscar por nombre" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} />
          <div className="flex items-center gap-2">
            <Checkbox id="activeOnly" checked={activeOnly} onCheckedChange={(v) => { setPage(1); setActiveOnly(!!v) }} />
            <Label htmlFor="activeOnly">Solo activos</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label>Empresa</Label>
            <Select value={companyFilter || '__all__'} onValueChange={(v) => { setPage(1); setCompanyFilter(v === '__all__' ? '' : v) }}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={openCreate}>Agregar sucursal</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>URL pública</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.company?.name || '-'}</TableCell>
                <TableCell>{item.address || '-'}</TableCell>
                <TableCell>{item.is_active ? 'Sí' : 'No'}</TableCell>
                <TableCell>
                  {item.slug ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const origin = typeof window !== 'undefined' ? window.location.origin : ''
                          const url = `${origin}/pqrs/${item.slug}`
                          try {
                            await navigator.clipboard.writeText(url)
                          } catch (e) {}
                        }}
                      >
                        Copiar URL
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const origin = typeof window !== 'undefined' ? window.location.origin : ''
                          const url = `${origin}/pqrs/${item.slug}`
                          setQrValue(url)
                          setQrOpen(true)
                        }}
                      >
                        Ver QR
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteId(item.id)}>Eliminar</Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                  {loading ? 'Cargando…' : 'Sin resultados'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">Total: {total} · Página {page} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => {
              setPageSize(Number(v))
              setPage(1)
            }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(1)} 
            disabled={page <= 1}
          >
            Primera
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))} 
            disabled={page <= 1}
          >
            Anterior
          </Button>
          
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {(() => {
              const maxVisible = 5
              const start = Math.max(1, Math.min(page - Math.floor(maxVisible / 2), totalPages - maxVisible + 1))
              const end = Math.min(totalPages, start + maxVisible - 1)
              const pages = []
              
              for (let i = start; i <= end; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={i === page ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(i)}
                  >
                    {i}
                  </Button>
                )
              }
              return pages
            })()}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
            disabled={page >= totalPages}
          >
            Siguiente
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(totalPages)} 
            disabled={page >= totalPages}
          >
            Última
          </Button>
        </div>
      </div>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Editar sucursal' : 'Agregar sucursal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Select value={formCompanyId} onValueChange={(v) => setFormCompanyId(v)}>
                <SelectTrigger id="company" className="w-full"><SelectValue placeholder="Selecciona una empresa" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={formActive} onCheckedChange={(v) => setFormActive(!!v)} />
              <Label htmlFor="active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button onClick={saveItem}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sucursal?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Código QR</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrValue && (
              <div ref={qrRef} className="bg-white p-4 rounded-md">
                <QRCode value={qrValue} size={200} />
              </div>
            )}
            <div className="text-xs text-muted-foreground break-all">{qrValue}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrOpen(false)}>Cerrar</Button>
            <Button onClick={downloadQr}>Descargar QR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}