import { FoodMapView } from '../components/foodmap/FoodMapView'
import { useContentState } from '../content/content'
import { RESTAURANTS } from '../data/jacksonHeightsMap'

export default function FoodMap() {
  const { content } = useContentState()
  // Live uit de DB; valt terug op de gebundelde startdata vóór migratie 0008.
  const restaurants = content?.restaurants?.length ? content.restaurants : RESTAURANTS

  return <FoodMapView restaurants={restaurants} />
}
