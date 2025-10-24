"use client"

import type React from "react"
import { use } from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageSquare, Heart, AlertCircle, FileText, HelpCircle, Lightbulb } from "lucide-react"

const TYPES = [
  {
    value: "Felicitación",
    label: "Felicitación",
    icon: Heart,
    color: "border-pink-200 hover:border-pink-400 hover:bg-pink-50",
  },
  {
    value: "Sugerencia",
    label: "Sugerencia",
    icon: Lightbulb,
    color: "border-amber-200 hover:border-amber-400 hover:bg-amber-50",
  },
  {
    value: "Solicitud",
    label: "Solicitud",
    icon: FileText,
    color: "border-blue-200 hover:border-blue-400 hover:bg-blue-50",
  },
  {
    value: "Petición",
    label: "Petición",
    icon: HelpCircle,
    color: "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50",
  },
  {
    value: "Queja",
    label: "Queja",
    icon: AlertCircle,
    color: "border-orange-200 hover:border-orange-400 hover:bg-orange-50",
  },
  {
    value: "Reclamo",
    label: "Reclamo",
    icon: MessageSquare,
    color: "border-red-200 hover:border-red-400 hover:bg-red-50",
  },
]

interface BranchInfo {
  id: string
  name: string
  slug: string
  address: string | null
  logo_url?: string | null
  is_active: boolean
  company_id: string
  company?: { id: string; name: string; logo_url?: string | null }
}

export default function PqrsPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [branch, setBranch] = useState<BranchInfo | null>(null)
  const [loadingBranch, setLoadingBranch] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [type, setType] = useState<string>("Felicitación")
  const [message, setMessage] = useState("")
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [secondLastName, setSecondLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const res = await fetch(`/api/sucursales/by-slug/${slug}`)
        const json = await res.json()
        if (!json.ok) {
          setError(json.error || "No se pudo cargar la información de la sucursal")
          return
        }
        setBranch(json.data)
      } catch (err) {
        setError("Error de conexión")
      } finally {
        setLoadingBranch(false)
      }
    }
    fetchBranch()
  }, [slug])

  const effectiveLogo = branch?.logo_url || branch?.company?.logo_url || null

  const typeAbbr: Record<string, string> = {
    Felicitación: "FE",
    Sugerencia: "SU",
    Solicitud: "SO",
    Petición: "PE",
    Queja: "QU",
    Reclamo: "RE",
  }
  function makeCode(t: string, id: string) {
    const abbr = typeAbbr[t] ?? "PQ"
    const hex = id.replace(/-/g, "")
    const num = parseInt(hex.slice(-8), 16) % 1000000
    const digits = num.toString().padStart(6, "0")
    return `${abbr}${digits}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branch) return
    setSubmitting(true)
    setError(null)

    const payload = {
      branch_id: branch.id,
      company_id: branch.company_id,
      type,
      message,
      first_name: isAnonymous ? "Anónimo" : firstName,
      middle_name: isAnonymous ? null : (middleName || null),
      last_name: isAnonymous ? "Anónimo" : lastName,
      second_last_name: isAnonymous ? null : (secondLastName || null),
      email,
      phone: phone || null,
      national_id: isAnonymous ? null : (nationalId || null),
    }

    const res = await fetch("/api/pqrs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!json.ok) {
      setError(json.error || "No se pudo enviar el formulario")
      return
    }
    setSubmittedId(json.data?.id || null)
    setMessage("")
    const code = json.data?.id ? makeCode(type, json.data.id) : null
    router.push(`/pqrs/gracias${code ? `?code=${code}` : ""}`)
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {loadingBranch ? (
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Cargando información...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
          </div>
        ) : branch ? (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-start gap-6 justify-center">
                {/* Logo on the left */}
                <div className="flex flex-col items-center gap-4 md:min-w-[300px]">
                  {effectiveLogo && (
                    <div className="w-full max-w-[300px]">
                      <Image
                        src={effectiveLogo || "/placeholder.svg"}
                        alt="Logo"
                        width={300}
                        height={100}
                        className="w-full h-auto  ring-4 ring-white"
                      />
                    </div>
                  )}
                </div>

                {/* Branch info on the right */}
                <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-primary/5 border border-primary/10 w-full md:w-auto">
                  <span className="text-sm font-medium text-primary">{branch.name}</span>
                  {branch.address && (
                    <span className="text-xs text-muted-foreground text-center">{branch.address}</span>
                  )}
                </div>
              </div>

              {/* Title and subtitle full width below */}
              <div className="w-full text-center space-y-2">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance leading-tight">
                  ¿Qué quieres contarnos?
                </h1>
                <p className="text-base md:text-lg text-muted-foreground text-pretty">
                  Tu opinión es importante para nosotros. Comparte tu experiencia y ayúdanos a mejorar.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-10 space-y-8"
            >
              <div className="space-y-4">
                <Label className="text-base font-semibold">Selecciona el tipo de mensaje</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {TYPES.map((t) => {
                    const Icon = t.icon
                    const isSelected = type === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={`
                          relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                          ${isSelected ? "border-primary bg-primary/5 shadow-md scale-[1.02]" : `${t.color} bg-white`}
                        `}
                      >
                        <Icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {t.label}
                        </span>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="message" className="text-base font-semibold">
                  Cuéntanos tu experiencia
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder="Describe tu experiencia con el mayor detalle posible..."
                  className="resize-none text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Proporciona todos los detalles relevantes para ayudarnos a entender mejor tu situación.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border"></div>
                  <span className="text-sm font-semibold text-muted-foreground">Información de contacto</span>
                  <div className="h-px flex-1 bg-border"></div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="anonymous" checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(!!checked)} />
                  <Label htmlFor="anonymous" className="text-sm">Quiero que sea anónimo</Label>
                </div>

                {!isAnonymous && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Primer nombre *</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        placeholder="Juan"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Segundo nombre</Label>
                      <Input
                        id="middleName"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        placeholder="Carlos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Primer apellido *</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        placeholder="Pérez"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondLastName">Segundo apellido</Label>
                      <Input
                        id="secondLastName"
                        value={secondLastName}
                        onChange={(e) => setSecondLastName(e.target.value)}
                        placeholder="García"
                      />
                    </div>
                  </div>
                )}

                <div className={`grid grid-cols-1 ${!isAnonymous ? "md:grid-cols-2" : "md:grid-cols-1"} gap-4`}>
                  {!isAnonymous && (
                    <div className="space-y-2">
                      <Label htmlFor="nationalId">Número de cédula</Label>
                      <Input
                        id="nationalId"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="1234567890"
                        className="max-w-md"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-base font-semibold h-12 cursor-pointer"
                  disabled={submitting || !branch?.id}
                >
                  {submitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                      Enviando...
                    </>
                  ) : (
                    "Enviar mensaje"
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Al enviar este formulario, aceptas que procesemos tu información para dar seguimiento a tu solicitud.
                </p>
              </div>

              {submittedId && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                  <p className="text-green-800 font-medium">¡Mensaje enviado exitosamente!</p>
                  <p className="text-sm text-green-700 mt-1">ID de seguimiento: {submittedId}</p>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}
