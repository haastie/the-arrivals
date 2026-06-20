import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../ui'
import { MapView } from './MapView'
import { RestaurantDetail } from './RestaurantDetail'
import { Phrasebook } from './Phrasebook'
import { HeartIcon } from './HeartIcon'
import { useFavorites } from './useFavorites'
import { COMMUNITIES, communityById, type Restaurant } from '../../data/jacksonHeightsMap'

const allActiveMap = () => Object.fromEntries(COMMUNITIES.map((c) => [c.id, true]))

/** Volledig scherm: kaart met overlays voor filter/legenda en detail-sheets. */
export function FoodMapView({ restaurants }: { restaurants: Restaurant[] }) {
  const [active, setActive] = useState<Record<string, boolean>>(allActiveMap)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewed, setViewed] = useState<string[]>([])
  const [phrasesOpen, setPhrasesOpen] = useState(false)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [phraseId, setPhraseId] = useState('hindi')
  const fav = useFavorites()

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of restaurants) m[r.communityId] = (m[r.communityId] ?? 0) + 1
    return m
  }, [restaurants])

  const selected = restaurants.find((r) => r.id === selectedId) ?? null

  function select(id: string) {
    setSelectedId(id)
    setPhrasesOpen(false)
    setFavoritesOpen(false)
    setViewed((v) => (v.includes(id) ? v : [...v, id]))
  }

  function surprise() {
    const onCommunity = (r: Restaurant) => active[r.communityId]
    let pool = restaurants.filter((r) => onCommunity(r) && !viewed.includes(r.id) && r.id !== selectedId)
    if (!pool.length) pool = restaurants.filter((r) => onCommunity(r) && r.id !== selectedId)
    if (!pool.length) pool = restaurants.filter(onCommunity)
    if (!pool.length) return
    select(pool[Math.floor(Math.random() * pool.length)].id)
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0e17]">
      {/* De kaart vult het hele scherm */}
      <div className="absolute inset-0">
        <MapView
          restaurants={restaurants}
          active={active}
          selectedId={selectedId}
          favoriteIds={fav.favoriteIds}
          onSelect={select}
        />
      </div>

      {/* Bovenste overlay: terug, titel, verras + filter/legenda */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/"
            aria-label="Terug"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-[#0a0e17]/80 text-lg text-paper backdrop-blur transition active:scale-95"
          >
            ←
          </Link>
          <div className="flex-1 rounded-2xl border border-white/10 bg-[#0a0e17]/80 px-3 py-1.5 backdrop-blur">
            <p className="font-mono text-[9px] tracking-[0.18em] text-paper/45 uppercase">Eten & taal</p>
            <p className="font-display text-base leading-tight font-bold text-paper">Jackson Heights</p>
          </div>
          <button
            type="button"
            onClick={surprise}
            aria-label="Verras me"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-glow/40 bg-amber-glow/15 text-lg text-amber-glow backdrop-blur transition active:scale-95"
          >
            ✦
          </button>
        </div>

        {/* Legenda = filter */}
        <div className="pointer-events-auto -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
          {COMMUNITIES.map((c) => {
            const on = active[c.id]
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive((a) => ({ ...a, [c.id]: !a[c.id] }))}
                aria-pressed={on}
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs backdrop-blur transition active:scale-95"
                style={{
                  background: on ? `${c.color}26` : 'rgba(10,14,23,0.78)',
                  borderColor: on ? c.color : 'rgba(255,255,255,0.15)',
                  color: on ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="font-semibold whitespace-nowrap">{c.label}</span>
                <span className="font-mono tabular-nums opacity-70">{counts[c.id] ?? 0}</span>
              </button>
            )
          })}
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-glow/40 bg-amber-glow/10 px-2.5 py-1.5 text-xs whitespace-nowrap text-amber-glow backdrop-blur">
            ★ <span className="font-semibold">4+ rating</span>
          </span>
        </div>
      </div>

      {/* Onderste acties: taalgids + favorieten (als er niets open is) */}
      {!selected && !phrasesOpen && !favoritesOpen && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center gap-2 p-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={() => setPhrasesOpen(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-[#0a0e17]/85 px-4 py-3 text-sm font-semibold text-paper shadow-2xl backdrop-blur transition active:scale-95"
          >
            📖 Taalgids
          </button>
          <button
            type="button"
            onClick={() => {
              setFavoritesOpen(true)
              fav.refetch()
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-[#0a0e17]/85 px-4 py-3 text-sm font-semibold text-paper shadow-2xl backdrop-blur transition active:scale-95"
          >
            <HeartIcon filled size={16} className="text-rose-300" />
            Favorieten{fav.favoriteIds.size > 0 ? ` (${fav.favoriteIds.size})` : ''}
          </button>
        </div>
      )}

      {/* Detail-sheet */}
      {selected && (
        <Sheet onClose={() => setSelectedId(null)}>
          <RestaurantDetail
            restaurant={selected}
            isFavorite={fav.mine.has(selected.id)}
            favoriteCount={fav.counts[selected.id] ?? 0}
            onToggleFavorite={() => fav.toggle(selected.id)}
          />
        </Sheet>
      )}

      {/* Taalgids-sheet */}
      {phrasesOpen && !selected && (
        <Sheet onClose={() => setPhrasesOpen(false)}>
          <Phrasebook phraseId={phraseId} onSetPhrase={setPhraseId} />
        </Sheet>
      )}

      {/* Favorieten-sheet (groepsshortlist) */}
      {favoritesOpen && !selected && (
        <Sheet onClose={() => setFavoritesOpen(false)}>
          <FavoritesList restaurants={restaurants} counts={fav.counts} mine={fav.mine} onSelect={select} />
        </Sheet>
      )}
    </div>
  )
}

/** Gezamenlijke favorietenlijst, gesorteerd op aantal hartjes. */
function FavoritesList({
  restaurants,
  counts,
  mine,
  onSelect,
}: {
  restaurants: Restaurant[]
  counts: Record<string, number>
  mine: Set<string>
  onSelect: (id: string) => void
}) {
  const favs = restaurants
    .filter((r) => (counts[r.id] ?? 0) > 0)
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <HeartIcon filled size={18} className="text-rose-mark" />
        <p className="font-display text-lg font-bold text-ink">Groepsfavorieten</p>
      </div>
      {favs.length === 0 ? (
        <p className="text-sm text-ink/55">
          Nog geen favorieten. Tik op het hartje bij een restaurant om er één toe te voegen — de hele
          groep ziet hier de gezamenlijke shortlist.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {favs.map((r) => {
            const c = communityById[r.communityId]
            const mineHere = mine.has(r.id)
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r.id)}
                className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-ink/5 px-3 py-2.5 text-left transition active:scale-[0.99]"
              >
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
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

/** Bottom-sheet boven de kaart, sluit via ✕ of tik op de achtergrond. */
function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[1100] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Sluiten"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative flex max-h-[86vh] flex-col">
        <div className="mx-auto mb-1.5 h-1.5 w-10 rounded-full bg-paper/50" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute top-4 right-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/85 text-paper shadow-lg transition active:scale-90"
        >
          ✕
        </button>
        <div
          className="overflow-y-auto px-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
