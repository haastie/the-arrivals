import { useMemo, useState } from 'react'
import { Card } from '../ui'
import { MapCanvas } from './MapCanvas'
import { RestaurantDetail } from './RestaurantDetail'
import { Phrasebook } from './Phrasebook'
import { COMMUNITIES, RESTAURANTS } from '../../data/jacksonHeightsMap'

const allActiveMap = () => Object.fromEntries(COMMUNITIES.map((c) => [c.id, true]))

export function FoodMapView() {
  const [active, setActive] = useState<Record<string, boolean>>(allActiveMap)
  const [showZones, setShowZones] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewed, setViewed] = useState<string[]>([])
  const [phraseId, setPhraseId] = useState('hindi')

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of RESTAURANTS) m[r.communityId] = (m[r.communityId] ?? 0) + 1
    return m
  }, [])

  const selected = RESTAURANTS.find((r) => r.id === selectedId) ?? null
  const allOn = COMMUNITIES.every((c) => active[c.id])

  function select(id: string) {
    setSelectedId(id)
    setViewed((v) => (v.includes(id) ? v : [...v, id]))
  }

  function surprise() {
    const onCommunity = (r: (typeof RESTAURANTS)[number]) => active[r.communityId]
    let pool = RESTAURANTS.filter((r) => onCommunity(r) && !viewed.includes(r.id) && r.id !== selectedId)
    if (!pool.length) pool = RESTAURANTS.filter((r) => onCommunity(r) && r.id !== selectedId)
    if (!pool.length) pool = RESTAURANTS.filter(onCommunity)
    if (!pool.length) return
    select(pool[Math.floor(Math.random() * pool.length)].id)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Communities-filter */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-bold tracking-[0.12em] text-clay uppercase">01 · Gemeenschappen</p>
          <button
            type="button"
            onClick={() => setActive(allOn ? Object.fromEntries(COMMUNITIES.map((c) => [c.id, false])) : allActiveMap())}
            className="font-mono text-[10px] tracking-wider text-ink/50 uppercase underline"
          >
            {allOn ? 'Niets' : 'Alles'}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {COMMUNITIES.map((c) => {
            const on = active[c.id]
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive((a) => ({ ...a, [c.id]: !a[c.id] }))}
                className="flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition"
                style={{
                  background: on ? `${c.color}22` : 'transparent',
                  borderColor: on ? c.color : 'rgba(0,0,0,0.12)',
                  opacity: on ? 1 : 0.5,
                }}
              >
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] leading-tight font-bold text-ink">{c.label}</span>
                  <span className="text-[10px] leading-tight text-ink/55">{c.sub}</span>
                </span>
                <span
                  className="font-display text-base font-bold"
                  style={{ color: on ? c.color : 'rgba(0,0,0,0.4)' }}
                >
                  {counts[c.id] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-ink/10 pt-3">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-ink uppercase">Buurtzones</p>
            <p className="text-[10px] text-ink/55">Waar elke gemeenschap zich clustert</p>
          </div>
          <button
            type="button"
            onClick={() => setShowZones((z) => !z)}
            aria-pressed={showZones}
            className={`relative h-6 w-11 rounded-full transition ${showZones ? 'bg-clay' : 'bg-ink/20'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                showZones ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={surprise}
          className="flex flex-col items-center gap-0.5 rounded-2xl bg-ink py-3 text-paper transition active:scale-[0.98] hover:bg-ink-soft"
        >
          <span className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
            ✦ Verras me
          </span>
          <span className="text-[10px] opacity-70">Spring naar een plek die je nog niet zag</span>
        </button>
      </Card>

      <MapCanvas
        restaurants={RESTAURANTS}
        active={active}
        showZones={showZones}
        selectedId={selectedId}
        viewed={viewed}
        onSelect={select}
      />

      {selected ? (
        <RestaurantDetail restaurant={selected} onBack={() => setSelectedId(null)} />
      ) : (
        <Phrasebook phraseId={phraseId} onSetPhrase={setPhraseId} />
      )}
    </div>
  )
}
