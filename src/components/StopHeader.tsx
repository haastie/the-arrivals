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
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink/60">
        {stop.food && (
          <>
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0 text-clay"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 2v7a3 3 0 0 0 3 3v10M6 2v6M9 2v6M16 2c-1.5 0-3 1.8-3 5s1.5 5 3 5v8" />
            </svg>
            <span>{stop.food}</span>
            <span className="text-ink/30">·</span>
          </>
        )}
        <span>{stop.location}</span>
      </p>
    </div>
  )
}
