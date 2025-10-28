'use client'

import { useEffect, useMemo, useState } from 'react'
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
  DialogTrigger,
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

interface Empresa {
  id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  logo_url?: string | null
}

export default function EmpresasPage() {
  const [items, setItems] = useState<Empresa[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (activeOnly) params.set('active', 'true')

    const res = await fetch(`/api/empresas?${params.toString()}`)
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
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, activeOnly])

  // Add/Edit modal state
  const [openModal, setOpenModal] = useState(false)
  const [editItem, setEditItem] = useState<Empresa | null>(null)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const openCreate = () => {
    setEditItem(null)
    setFormName('')
    setFormAddress('')
    setFormActive(true)
    setFormLogoUrl('')
    setOpenModal(true)
  }
  const openEdit = (item: Empresa) => {
    setEditItem(item)
    setFormName(item.name)
    setFormAddress(item.address || '')
    setFormActive(item.is_active)
    setFormLogoUrl(item.logo_url || '')
    setOpenModal(true)
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/uploads/logo', { method: 'POST', body: fd })
    const json = await res.json()
    setUploadingLogo(false)
    if (!json.ok) {
      return setError(json.error || 'Error al subir logo')
    }
    setFormLogoUrl(json.url)
  }

  const saveItem = async () => {
    const payload = { name: formName.trim(), address: formAddress.trim() || null, is_active: formActive, logo_url: formLogoUrl.trim() || null }
    if (!payload.name) return setError('El nombre es obligatorio')

    const res = await fetch(editItem ? `/api/empresas/${editItem.id}` : '/api/empresas', {
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
    const res = await fetch(`/api/empresas/${deleteId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) {
      return setError(json.error || 'Error al eliminar')
    }
    setDeleteId(null)
    fetchData()
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
        </div>
        <Button onClick={openCreate}>Agregar empresa</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.address || '-'}</TableCell>
                <TableCell>{item.is_active ? 'Sí' : 'No'}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteId(item.id)}>Eliminar</Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
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

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Editar empresa' : 'Agregar empresa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo (archivo local)</Label>
              <Input id="logo" type="file" accept="image/*" onChange={handleLogoFileChange} />
              {uploadingLogo && <p className="text-xs text-muted-foreground">Subiendo…</p>}
              {formLogoUrl && <p className="text-xs text-muted-foreground break-all">Guardado: {formLogoUrl}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={formActive} onCheckedChange={(v) => setFormActive(!!v)} />
              <Label htmlFor="active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button onClick={saveItem}>{editItem ? 'Guardar cambios' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
        <DialogTrigger asChild></DialogTrigger>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <p className="text-destructive text-sm" aria-live="polite">{error}</p>}
    </div>
  )
}