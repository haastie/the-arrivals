import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../../lib/supabase'

const DEVICE_KEY = 'arrivals_device_id'

/** Anonieme toestel-id (UUID), eenmalig aangemaakt en bewaard in localStorage. */
function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'server'
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export interface FavoriteRow {
  restaurant_id: string
  device_id: string
}

/** Telt per restaurant hoeveel toestellen het favoriet maakten, en welke van dit toestel zijn. */
export function aggregateFavorites(rows: FavoriteRow[], deviceId: string) {
  const counts: Record<string, number> = {}
  const mine = new Set<string>()
  for (const r of rows) {
    counts[r.restaurant_id] = (counts[r.restaurant_id] ?? 0) + 1
    if (r.device_id === deviceId) mine.add(r.restaurant_id)
  }
  return { counts, mine }
}

export interface FavoritesState {
  counts: Record<string, number>
  mine: Set<string>
  favoriteIds: Set<string>
  toggle: (restaurantId: string) => void
  refetch: () => void
  ready: boolean
}

export function useFavorites(): FavoritesState {
  const [deviceId] = useState(getDeviceId)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  const refetch = useCallback(async () => {
    if (!supabaseConfigured) {
      setReady(true)
      return
    }
    const { data, error } = await supabase.from('favorites').select('restaurant_id, device_id')
    if (!error && data) {
      const agg = aggregateFavorites(data as FavoriteRow[], deviceId)
      setCounts(agg.counts)
      setMine(agg.mine)
    }
    setReady(true)
  }, [deviceId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const toggle = useCallback(
    (restaurantId: string) => {
      const isMine = mine.has(restaurantId)
      // Optimistisch bijwerken zodat de UI direct reageert.
      setMine((prev) => {
        const next = new Set(prev)
        if (isMine) next.delete(restaurantId)
        else next.add(restaurantId)
        return next
      })
      setCounts((prev) => ({
        ...prev,
        [restaurantId]: Math.max(0, (prev[restaurantId] ?? 0) + (isMine ? -1 : 1)),
      }))
      if (!supabaseConfigured) return
      supabase
        .rpc('favorite_set', { p_restaurant_id: restaurantId, p_device_id: deviceId, p_on: !isMine })
        .then(({ error }) => {
          if (error) refetch() // bij fout: herstel met verse server-data
        })
    },
    [mine, deviceId, refetch],
  )

  const favoriteIds = new Set(Object.keys(counts).filter((id) => counts[id] > 0))

  return { counts, mine, favoriteIds, toggle, refetch, ready }
}
