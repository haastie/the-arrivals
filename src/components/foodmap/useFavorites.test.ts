import { describe, it, expect } from 'vitest'
import { aggregateFavorites, type FavoriteRow } from './useFavorites'

describe('aggregateFavorites', () => {
  const rows: FavoriteRow[] = [
    { restaurant_id: 'arepa', device_id: 'me' },
    { restaurant_id: 'arepa', device_id: 'other-1' },
    { restaurant_id: 'arepa', device_id: 'other-2' },
    { restaurant_id: 'lhasa', device_id: 'other-1' },
  ]

  it('telt per restaurant het aantal toestellen', () => {
    const { counts } = aggregateFavorites(rows, 'me')
    expect(counts.arepa).toBe(3)
    expect(counts.lhasa).toBe(1)
  })

  it('herkent de favorieten van dit toestel', () => {
    const { mine } = aggregateFavorites(rows, 'me')
    expect(mine.has('arepa')).toBe(true)
    expect(mine.has('lhasa')).toBe(false)
  })

  it('lege invoer geeft lege tellingen', () => {
    const { counts, mine } = aggregateFavorites([], 'me')
    expect(Object.keys(counts)).toHaveLength(0)
    expect(mine.size).toBe(0)
  })
})
