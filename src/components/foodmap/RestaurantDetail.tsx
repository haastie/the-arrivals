import { Card } from '../ui'
import { SpeakButton } from './SpeakButton'
import {
  communityById,
  restaurantPhrase,
  type Restaurant,
} from '../../data/jacksonHeightsMap'

/** Detailkaart van een geselecteerd restaurant. */
export function RestaurantDetail({
  restaurant,
  onBack,
}: {
  restaurant: Restaurant
  onBack: () => void
}) {
  const c = communityById[restaurant.communityId]
  const { group, phrase } = restaurantPhrase(restaurant)
  const speakText = group.roman ? phrase.roman : phrase.native

  return (
    <Card className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 self-start font-mono text-[11px] tracking-[0.06em] text-ink/50 uppercase"
      >
        ← Terug naar taalgids
      </button>

      <div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] uppercase"
          style={{ background: `${c.color}22`, color: c.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
          {c.label}
        </span>
        <h2 className="font-display mt-2 text-2xl leading-tight font-bold text-ink">{restaurant.name}</h2>
      </div>

      <div className="flex items-stretch gap-3">
        <div
          className="flex flex-col items-center justify-center rounded-2xl px-4 py-2 text-white"
          style={{ background: c.color }}
        >
          <span className="font-display text-3xl leading-none font-bold tabular-nums">
            {restaurant.rating.toFixed(1)}
          </span>
          <span className="mt-0.5 text-[9px] font-bold tracking-wider opacity-90">VAN DE 5</span>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-1 text-sm">
          <p className="font-semibold text-ink">
            {restaurant.cuisine} · {restaurant.price}
          </p>
          <p className="text-ink/55">{restaurant.address}</p>
          <p className="text-ink/45">
            ~{restaurant.ratingCount} reviews · {restaurant.ratingSource}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-ink/5 px-4 py-3">
        <p className="text-[10px] font-bold tracking-[0.12em] text-clay uppercase">✦ De consensus</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{restaurant.consensus}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-bold tracking-[0.12em] text-ink/45 uppercase">Wat mensen zeggen</p>
        {restaurant.quotes.map((q, i) => (
          <div key={i} className="border-l-2 border-ink/20 pl-3">
            <p className="font-display text-base leading-snug text-ink italic">“{q.text}”</p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.04em] text-ink/45 uppercase">{q.source}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-ink/5 px-4 py-3">
        <p className="text-[10px] font-bold tracking-[0.12em] text-ink/45 uppercase">
          Bestel dit · meest aanbevolen
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="font-display text-lg leading-snug text-ink">{restaurant.dish}</span>
        </div>
        <p className="mt-1 text-xs text-ink/45">via {restaurant.dishSource}</p>
      </div>

      <div className="rounded-2xl border border-ink/15 px-4 py-3">
        <p className="text-[10px] font-bold tracking-[0.12em] text-ink/45 uppercase">
          Dit hoor je hier · {group.label}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink/55">Zeg eens — {phrase.en}</p>
            <p className="text-lg leading-tight font-bold text-ink">{phrase.native}</p>
            <p className="text-xs text-ink/55 italic">{phrase.roman}</p>
          </div>
          <SpeakButton text={speakText} lang={group.ttsLang} size={40} />
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-ink/40">
        Ratings &amp; citaten samengevat uit publieke bronnen — Yelp, Tripadvisor, The Infatuation,
        Gothamist &amp; Untapped New York.
      </p>
    </Card>
  )
}
