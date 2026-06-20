import { Card } from '../ui'
import { HeartIcon } from './HeartIcon'
import { communityById, type Restaurant } from '../../data/jacksonHeightsMap'

/** Gezamenlijke favorietenlijst, gesorteerd op aantal hartjes. Rijen zijn
 *  aanklikbaar als `onSelect` is meegegeven (op de kaart), anders informatief. */
export function FavoritesList({
  restaurants,
  counts,
  mine,
  onSelect,
}: {
  restaurants: Restaurant[]
  counts: Record<string, number>
  mine: Set<string>
  onSelect?: (id: string) => void
}) {
  const favs = restaurants
    .filter((r) => (counts[r.id] ?? 0) > 0)
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))

  const rowClass = `flex items-center gap-3 rounded-2xl border border-ink/10 bg-ink/5 px-3 py-2.5 text-left ${
    onSelect ? 'transition active:scale-[0.99]' : ''
  }`

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <HeartIcon filled size={18} className="text-rose-mark" />
        <p className="font-display text-lg font-bold text-ink">Groepsfavorieten</p>
      </div>
      {favs.length === 0 ? (
        <p className="text-sm text-ink/55">
          Nog geen favorieten. Deelnemers tikken op het hartje bij een restaurant — hier verschijnt de
          gezamenlijke shortlist van de groep.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {favs.map((r) => {
            const c = communityById[r.communityId]
            const mineHere = mine.has(r.id)
            const inner = (
              <>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c?.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{r.name}</span>
                  <span className="block truncate text-[11px] text-ink/55">
                    {r.cuisine} · {c?.label}
                  </span>
                </span>
                <span
                  className={`flex shrink-0 items-center gap-1 text-sm font-semibold ${
                    mineHere ? 'text-rose-mark' : 'text-ink/45'
                  }`}
                >
                  <HeartIcon filled={mineHere} size={14} />
                  {counts[r.id] ?? 0}
                </span>
              </>
            )
            return onSelect ? (
              <button key={r.id} type="button" onClick={() => onSelect(r.id)} className={rowClass}>
                {inner}
              </button>
            ) : (
              <div key={r.id} className={rowClass}>
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
