import { Link } from 'react-router-dom'

const TABS = [
  { id: 'quiz', label: 'Quiz', to: '/play' },
  { id: 'eten', label: 'Eten & taal', to: '/eten' },
] as const

export type ViewSwitchTab = (typeof TABS)[number]['id']

/**
 * Segment-schakelaar tussen de quiz (/play) en de eten- & taalkaart (/eten).
 * Navigeert client-side, dus score en sessie blijven behouden bij wisselen.
 * Donker en backdrop-blur zodat hij ook leesbaar boven de kaart staat.
 */
export function ViewSwitch({ current }: { current: ViewSwitchTab }) {
  return (
    <div className="inline-flex shrink-0 rounded-2xl border border-white/15 bg-[#0a0e17]/80 p-1 backdrop-blur">
      {TABS.map((t) => {
        const active = t.id === current
        return active ? (
          <span
            key={t.id}
            aria-current="page"
            className="rounded-xl bg-amber-glow px-3.5 py-1.5 text-sm font-semibold text-ink"
          >
            {t.label}
          </span>
        ) : (
          <Link
            key={t.id}
            to={t.to}
            className="rounded-xl px-3.5 py-1.5 text-sm font-semibold text-paper/60 transition active:scale-95"
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
