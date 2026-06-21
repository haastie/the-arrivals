import { FoodMapView } from '../components/foodmap/FoodMapView'
import { ViewSwitch } from '../components/ViewSwitch'
import { useContentState } from '../content/content'
import { RESTAURANTS } from '../data/jacksonHeightsMap'
import { loadParticipant } from '../lib/identity'

export default function FoodMap() {
  const { content } = useContentState()
  // Live uit de DB; valt terug op de gebundelde startdata vóór migratie 0008.
  const restaurants = content?.restaurants?.length ? content.restaurants : RESTAURANTS
  // Deelnemers krijgen de quiz/eten-schakelaar i.p.v. de terug-naar-home knop,
  // zodat ze kunnen wisselen zonder hun score of sessie kwijt te raken.
  const isParticipant = loadParticipant() !== null

  return (
    <FoodMapView
      restaurants={restaurants}
      navSlot={isParticipant ? <ViewSwitch current="eten" /> : undefined}
    />
  )
}
