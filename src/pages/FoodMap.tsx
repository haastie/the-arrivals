import { Link } from 'react-router-dom'
import { Screen } from '../components/ui'
import { FoodMapView } from '../components/foodmap/FoodMapView'
import { useContentState } from '../content/content'
import { RESTAURANTS } from '../data/jacksonHeightsMap'

export default function FoodMap() {
  const { content } = useContentState()
  // Live uit de DB; valt terug op de gebundelde startdata vóór migratie 0008.
  const restaurants = content?.restaurants?.length ? content.restaurants : RESTAURANTS

  return (
    <Screen>
      <header className="ta-rise mb-4">
        <p className="font-mono text-[10px] tracking-[0.2em] text-paper/45 uppercase">
          Eten & taal · 's werelds meest diverse vierkante mijl
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h1 className="font-display text-4xl leading-[0.95] font-bold text-paper">
            Jackson Heights
          </h1>
          <div className="text-right leading-none">
            <div className="font-display text-3xl font-bold text-amber-glow">167</div>
            <div className="mt-1 font-mono text-[9px] tracking-[0.16em] text-paper/45 uppercase">
              talen
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-paper/65">
          Ontdek de keukens langs de route - filter op gemeenschap, tik een stip voor reviews en het
          aanbevolen gerecht, en leer de taal van de zaak spreken.
        </p>
      </header>

      <FoodMapView restaurants={restaurants} />

      <div className="mt-8 text-center">
        <Link to="/" className="text-xs text-paper/40 underline underline-offset-4">
          Terug
        </Link>
      </div>
    </Screen>
  )
}
