import type { ButtonHTMLAttributes, ReactNode } from 'react'

// --- Knop ---------------------------------------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-amber-300 to-amber-glow text-ink shadow-[0_10px_30px_-10px_rgba(251,191,36,0.55)] hover:from-amber-200 hover:to-amber-300',
  secondary:
    'bg-paper/10 text-paper border border-paper/15 backdrop-blur-sm hover:bg-paper/15 hover:border-paper/30',
  ghost: 'bg-transparent text-paper/80 hover:text-paper hover:bg-paper/5',
  danger: 'bg-rose-mark text-white shadow-[0_10px_30px_-12px_rgba(190,18,60,0.6)] hover:brightness-110',
  success: 'bg-jade text-white shadow-[0_10px_30px_-12px_rgba(4,120,87,0.6)] hover:brightness-110',
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
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-semibold tracking-tight transition duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
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
      className={`rounded-3xl border border-black/5 bg-paper p-5 text-ink shadow-[0_1px_3px_rgba(2,6,23,0.08),0_22px_45px_-24px_rgba(2,6,23,0.6)] ${
        accent
          ? 'ring-2 ring-amber-glow shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_22px_55px_-22px_rgba(251,191,36,0.5)]'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

// --- Mono-label (vertrekbord-stijl) -------------------------------------
export function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-paper/15 bg-paper/5 px-2.5 py-1 font-mono text-[11px] tracking-[0.18em] text-paper/70 uppercase ${className}`}
    >
      {children}
    </span>
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
    <div className="min-h-dvh w-full">
      <div className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-5 pb-10 ${className}`}>
        {children}
      </div>
    </div>
  )
}

// --- Meertalige groet in de header (knipoog naar diversiteit) ------------
export function MultilingualGreeting({ className = '' }: { className?: string }) {
  return (
    <p
      className={`font-mono text-[11px] tracking-[0.22em] text-amber-glow/85 uppercase ${className}`}
    >
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
