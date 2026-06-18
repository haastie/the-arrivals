import { COMMUNITIES, ZONES, type Restaurant, communityById } from '../../data/jacksonHeightsMap'

/** Gestileerde kaart van Jackson Heights met gekleurde restaurant-pins. */
export function MapCanvas({
  restaurants,
  active,
  showZones,
  selectedId,
  viewed,
  onSelect,
}: {
  restaurants: Restaurant[]
  active: Record<string, boolean>
  showZones: boolean
  selectedId: string | null
  viewed: string[]
  onSelect: (id: string) => void
}) {
  const visible = restaurants.filter((r) => active[r.communityId])
  const avenues = [
    { top: 16, label: 'Northern Blvd' },
    { top: 32, label: '34th Ave · Open St' },
    { top: 50, label: '37th Avenue' },
  ]

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-paper/10 bg-ink-soft">
      {/* straten */}
      {avenues.map((a) => (
        <div
          key={a.label}
          className="absolute right-0 left-0 border-t border-dashed border-paper/15"
          style={{ top: `${a.top}%` }}
        >
          <span className="absolute -top-2 left-2 bg-ink-soft px-1 font-mono text-[9px] tracking-[0.12em] text-paper/35 uppercase">
            {a.label}
          </span>
        </div>
      ))}

      {/* Roosevelt Ave + 7-trein */}
      <div className="absolute right-0 left-0" style={{ top: '78%' }}>
        <div className="h-[3px] w-full bg-paper/20" />
        <span className="absolute -top-2.5 left-2 bg-ink-soft px-1 font-mono text-[10px] tracking-[0.08em] text-amber-glow/80 uppercase">
          Roosevelt Ave
        </span>
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-ink-soft px-1.5">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C5362B] text-[9px] font-bold text-white">
            7
          </span>
          <span className="font-mono text-[8px] tracking-[0.06em] text-paper/55 uppercase">74 St</span>
        </span>
      </div>

      {/* community-zones */}
      {showZones &&
        COMMUNITIES.filter((c) => active[c.id]).map((c) => {
          const z = ZONES[c.id]
          return (
            <div
              key={c.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${z.cx}%`,
                top: `${z.cy}%`,
                width: `${z.rx * 2}%`,
                height: `${z.ry * 2}%`,
                background: `radial-gradient(closest-side, ${c.color}55, ${c.color}10 76%, transparent)`,
              }}
            />
          )
        })}

      {/* pins */}
      {visible.map((r) => {
        const c = communityById[r.communityId]
        const selected = selectedId === r.id
        const seen = viewed.includes(r.id)
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            title={r.name}
            aria-label={r.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${r.x}%`, top: `${r.y}%`, zIndex: selected ? 70 : seen ? 40 : 30 }}
          >
            {selected && (
              <span
                className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full"
                style={{ background: c.color }}
              />
            )}
            <span
              className="relative block rounded-full border-2 border-ink-soft"
              style={{
                width: selected ? 18 : 13,
                height: selected ? 18 : 13,
                background: c.color,
                opacity: seen && !selected ? 0.5 : 1,
                boxShadow: selected ? `0 0 0 3px ${c.color}` : '0 1px 4px rgba(0,0,0,.5)',
              }}
            />
          </button>
        )
      })}

      <p className="pointer-events-none absolute right-2 bottom-2 max-w-[55%] text-right text-[10px] leading-tight text-paper/35">
        Gestileerde kaart · tik een stip voor een keuken.
      </p>
    </div>
  )
}
