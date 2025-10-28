# Branding del Sistema

Este documento describe cómo aplicar y usar el nuevo branding en la plataforma, incluyendo los tokens de diseño, tipografías, colores, estados, accesibilidad y buenas prácticas.

## Tokens Globales

- Colores principales:
  - `background`, `foreground`, `card`, `popover`
  - `border`, `input`, `ring`
  - `primary`, `primary-foreground`
  - `secondary`, `secondary-foreground`
  - `muted`, `muted-foreground`
  - `accent`, `accent-foreground`
  - `destructive`, `destructive-foreground`
  - `chart-1` … `chart-5`

- Tipografías:
  - `--font-sans`: Ubuntu
  - `--font-serif`: Source Serif 4
  - `--font-mono`: JetBrains Mono

- Radios y sombras:
  - `--radius`: radio base
  - Clases: `rounded-md`, `rounded-lg`, `shadow-xs`, `shadow-md`

- Espaciado y tracking:
  - Clases: `space-x-*`, `space-y-*`, `tracking-wide`, responsive (`sm:*`, `md:*`, etc.)

## Uso con Tailwind

- Fondo y texto:
  - `bg-background`, `text-foreground`
  - Tarjetas: `bg-card`, `text-card-foreground`, `border-border`

- Interactivos:
  - Botón primario: `bg-primary text-primary-foreground hover:bg-primary/90`
  - Botón destructivo: `bg-destructive text-white hover:bg-destructive/90`
  - Enlaces: `text-primary hover:text-primary/80`

- Formulario:
  - Inputs: `border-input focus-visible:border-ring focus-visible:ring-ring/50`
  - Select: `focus:bg-accent focus:text-accent-foreground`
  - Checkbox checked: `data-[state=checked]:bg-primary data-[state=checked]:border-primary`

- Estados y alertas:
  - Éxito: `bg-primary/10 border border-primary/20 text-primary`
  - Error: `bg-destructive/10 border border-destructive/20 text-destructive`

- Gráficas y barras:
  - `bg-chart-1/60`, `bg-chart-2/60`, … para columnas y barras

## Tipografía

- Configurada en `src/app/layout.tsx` con Next Fonts:
  - `Ubuntu` como `--font-sans`
  - `Source Serif 4` como `--font-serif`
  - `JetBrains Mono` como `--font-mono`
- Uso por defecto en `body`: `font-sans` y variables aplicadas.

## Accesibilidad (WCAG)

- Focus visible: `focus-visible:ring-[3px] ring-ring/50` en interactivos.
- Estados de error vía ARIA: `aria-invalid:*` con `ring-destructive/20` y `border-destructive`.
- Roles en alertas: `role="alert"` y `aria-live="polite"` para mensajes dinámicos.
- Contraste: colores derivados de tokens aseguran contraste en modo claro/oscuro.

## Patrones de Componentes

- Botones (`components/ui/button.tsx`): variantes `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
- Inputs (`components/ui/input.tsx`): borde, foco, selección y estados accesibles por defecto.
- Select (`components/ui/select.tsx`): trigger con foco accesible y contenidos en `popover`.
- Checkbox (`components/ui/checkbox.tsx`): estado `checked` con `bg-primary` y borde `primary`.

## Ejemplos

```tsx
// Fondo de sección y botón primario
<section className="bg-background text-foreground">
  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Acción</Button>
</section>

// Tarjeta con borde y anillo
<div className="bg-card border border-border ring-1 ring-ring/10 rounded-lg p-6" />

// Alerta de error
<div className="bg-destructive/10 border border-destructive/20 p-4" role="alert">
  <p className="text-destructive">Ha ocurrido un error</p>
</div>

// Barra de progreso
<div className="h-3 rounded bg-muted relative">
  <div className="absolute left-0 top-0 bottom-0 bg-primary/70" style={{ width: "64%" }} />
</div>
```

## Buenas Prácticas

- No usar colores hardcodeados (`bg-blue-500`); siempre usar tokens.
- Mantener consistencia de estados: `hover`, `active`, `focus-visible`.
- Revisar en modo oscuro: tokens ya definen variantes `dark`.
- Validar contraste y lectura en tamaños móviles y de escritorio.

## Ubicación y Mantenimiento

- Tokens definidos en `src/app/globals.css` y derivados de `src/app/estilos.txt`.
- Ajustes de tipografía en `src/app/layout.tsx`.
- Este documento: `DESIGN_BRANDING.md`. Actualizar cuando cambien tokens o lineamientos.