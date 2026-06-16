import type { Stop } from '../content/types'

/** Stopnummer, naam, era/laag - zoals voorgeschreven in de handoff (§7). */
export function StopHeader({ stop }: { stop: Stop }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-clay">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-clay px-1.5 text-paper">
          {stop.number}
        </span>
        <span>{stop.era}</span>
        <span className="text-ink/30">·</span>
        <span className="text-ink/60">{stop.layer}</span>
      </div>
      <h2 className="font-display mt-1 text-2xl leading-tight font-bold text-ink">{stop.name}</h2>
      {stop.food && (
        <p className="mt-0.5 text-sm text-ink/60">🍽️ {stop.food} · {stop.location}</p>
      )}
    </div>
  )
}
