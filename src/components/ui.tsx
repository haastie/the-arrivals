import type { ButtonHTMLAttributes, ReactNode } from 'react'

// --- Knop ---------------------------------------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-amber-glow text-ink hover:brightness-105 active:brightness-95',
  secondary: 'bg-ink-soft text-paper border border-paper/20 hover:border-paper/40',
  ghost: 'bg-transparent text-paper/80 hover:text-paper hover:bg-paper/5',
  danger: 'bg-rose-mark text-white hover:brightness-110',
  success: 'bg-jade text-white hover:brightness-110',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
}

export function Button({
  variant = 'primary',
  block,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        variantClasses[variant]
      } ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

// --- Kaart ---------------------------------------------------------------
export function Card({
  children,
  className = '',
  accent,
}: {
  children: ReactNode
  className?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-3xl bg-paper p-5 text-ink shadow-lg ${
        accent ? 'ring-2 ring-amber-glow' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

// --- Schermlayout (mobile-first, gecentreerde kolom) ---------------------
export function Screen({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="min-h-full w-full bg-ink">
      <div className={`mx-auto flex min-h-full w-full max-w-md flex-col px-4 pt-5 pb-10 ${className}`}>
        {children}
      </div>
    </div>
  )
}

// --- Meertalige groet in de header (knipoog naar diversiteit) ------------
export function MultilingualGreeting({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs tracking-wide text-amber-glow/80 ${className}`}>
      hola · namaste · tashi delek · হ্যালো · hello
    </p>
  )
}

// --- Verbindingsindicator ------------------------------------------------
export function ConnectionBadge({
  status,
}: {
  status: 'connecting' | 'live' | 'reconnecting'
}) {
  const map = {
    connecting: { label: 'Verbinden…', color: 'bg-amber-glow' },
    live: { label: 'Live', color: 'bg-jade' },
    reconnecting: { label: 'Opnieuw verbinden…', color: 'bg-rose-mark' },
  } as const
  const s = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-2.5 py-1 text-xs font-medium text-paper/80">
      <span className={`h-2 w-2 rounded-full ${s.color} ${status !== 'live' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  )
}

// --- Inline melding ------------------------------------------------------
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'error'
  children: ReactNode
}) {
  const tones = {
    info: 'bg-paper/10 text-paper/90 border-paper/20',
    warn: 'bg-amber-glow/15 text-amber-glow border-amber-glow/40',
    error: 'bg-rose-mark/15 text-rose-300 border-rose-mark/40',
  } as const
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  )
}
