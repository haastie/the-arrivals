import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import {
  JH_CENTER,
  communityById,
  restaurantLatLng,
  type Restaurant,
} from '../../data/jacksonHeightsMap'

const STAR_PATH = 'M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01z'

const iconCache = new Map<string, L.DivIcon>()
function pinIcon(color: string, selected: boolean, star: boolean): L.DivIcon {
  const key = `${color}${selected ? '-s' : ''}${star ? '-x' : ''}`
  let icon = iconCache.get(key)
  if (!icon) {
    if (star) {
      const d = selected ? 32 : 23
      const glow = selected ? ` drop-shadow(0 0 3px ${color})` : ''
      icon = L.divIcon({
        className: '',
        html: `<svg width="${d}" height="${d}" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.75))${glow}"><path d="${STAR_PATH}" fill="${color}" stroke="#0a0e17" stroke-width="1.6"/></svg>`,
        iconSize: [d, d],
        iconAnchor: [d / 2, d / 2],
      })
    } else {
      const d = selected ? 24 : 15
      icon = L.divIcon({
        className: '',
        html: `<span style="display:block;width:${d}px;height:${d}px;border-radius:50%;background:${color};border:2px solid #0a0e17;box-shadow:${
          selected ? `0 0 0 4px ${color}, 0 0 0 6px rgba(255,255,255,.5)` : '0 1px 4px rgba(0,0,0,.6)'
        }"></span>`,
        iconSize: [d, d],
        iconAnchor: [d / 2, d / 2],
      })
    }
    iconCache.set(key, icon)
  }
  return icon
}

const userIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,.30)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

/** Past het beeld één keer aan zodat álle restaurants tegelijk in beeld zijn. */
function FitAll({ restaurants }: { restaurants: Restaurant[] }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !restaurants.length) return
    const pts = restaurants.map(restaurantLatLng)
    map.fitBounds(L.latLngBounds(pts), { padding: [56, 56], maxZoom: 16 })
    done.current = true
  }, [restaurants, map])
  return null
}

/** Echte, pan/zoom-bare kaart van Jackson Heights met geclusterde pins. */
export function MapView({
  restaurants,
  active,
  selectedId,
  onSelect,
}: {
  restaurants: Restaurant[]
  active: Record<string, boolean>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [map, setMap] = useState<L.Map | null>(null)
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const visible = restaurants.filter((r) => active[r.communityId])

  // Live locatie volgen (best-effort; stil falen als geweigerd).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  function flyToMe() {
    if (!map) return
    if (userPos) map.flyTo(userPos, Math.max(map.getZoom(), 16))
    else map.locate({ setView: true, maxZoom: 16 })
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        ref={setMap}
        center={JH_CENTER}
        zoom={14}
        minZoom={12}
        maxZoom={19}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#0a0e17' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <ZoomControl position="bottomright" />
        <FitAll restaurants={restaurants} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={22} disableClusteringAtZoom={16}>
          {visible.map((r) => {
            const c = communityById[r.communityId]
            return (
              <Marker
                key={r.id}
                position={restaurantLatLng(r)}
                icon={pinIcon(c?.color ?? '#888888', selectedId === r.id, r.rating > 4)}
                eventHandlers={{ click: () => onSelect(r.id) }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  {r.rating > 4 ? `★ ${r.name}` : r.name}
                </Tooltip>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
        {userPos && (
          <Marker position={userPos} icon={userIcon} zIndexOffset={1000}>
            <Tooltip direction="top" offset={[0, -6]}>
              Jij bent hier
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {/* Recenter op mijn locatie (boven de zoomknoppen) */}
      <button
        type="button"
        onClick={flyToMe}
        aria-label="Naar mijn locatie"
        className="absolute right-2.5 bottom-24 z-[1000] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-[#0a0e17]/85 text-xl text-paper shadow-lg backdrop-blur transition active:scale-95"
      >
        ⌖
      </button>
    </div>
  )
}
