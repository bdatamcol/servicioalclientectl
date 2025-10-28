"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Home } from "lucide-react"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

function GraciasContent() {
  const params = useSearchParams()
  const code = params.get("code")
  return (
    <div className="min-h-svh flex items-center justify-center px-4 bg-gradient-to-br from-accent via-background to-accent">
      <div className="w-full max-w-2xl">
        {/* Success Icon with Animation */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-card rounded-full p-6 shadow-lg ring-1 ring-ring/10">
              <CheckCircle2 className="w-16 h-16 text-primary" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-card rounded-2xl shadow-xl ring-1 ring-border p-8 md:p-12 text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-balance bg-gradient-to-br from-primary to-primary/90 bg-clip-text text-transparent">
              ¡Gracias por tu mensaje!
            </h1>
            <p className="text-lg text-muted-foreground text-balance max-w-lg mx-auto leading-relaxed">
              Tu solicitud ha sido enviada exitosamente. Nuestro equipo la revisará y se pondrá en contacto contigo a la
              brevedad.
            </p>
          </div>

          {code && (
            <div className="rounded-md bg-accent border border-accent px-4 py-3 font-semibold text-accent-foreground tracking-wide">
              TU CÓDIGO DE PQR ES: {code}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4">
            <Link href="/" className="inline-block w-full max-w-sm">
              <Button
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] cursor-pointer"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          ¿Necesitas ayuda adicional?{" "}
          <Link
            href="https://api.whatsapp.com/send/?phone=573174337348"
            target="_blank"
            className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 cursor-pointer"
          >
            Contáctanos
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function GraciasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <GraciasContent />
    </Suspense>
  )
}
