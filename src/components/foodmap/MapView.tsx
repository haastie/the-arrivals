import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import {
  JH_CENTER,
  communityById,
  restaurantLatLng,
  type Restaurant,
} from '../../data/jacksonHeightsMap'

const iconCache = new Map<string, L.DivIcon>()
function pinIcon(color: string, selected: boolean): L.DivIcon {
  const key = `${color}${selected ? '-s' : ''}`
  let icon = iconCache.get(key)
  if (!icon) {
    const d = selected ? 24 : 15
    icon = L.divIcon({
      className: '',
      html: `<span style="display:block;width:${d}px;height:${d}px;border-radius:50%;background:${color};border:2px solid #0a0e17;box-shadow:${
        selected ? `0 0 0 4px ${color}, 0 0 0 6px rgba(255,255,255,.5)` : '0 1px 4px rgba(0,0,0,.6)'
      }"></span>`,
      iconSize: [d, d],
      iconAnchor: [d / 2, d / 2],
    })
    iconCache.set(key, icon)
  }
  return icon
}

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
  const visible = restaurants.filter((r) => active[r.communityId])
  return (
    <MapContainer
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
      <MarkerClusterGroup chunkedLoading maxClusterRadius={45}>
        {visible.map((r) => {
          const c = communityById[r.communityId]
          return (
            <Marker
              key={r.id}
              position={restaurantLatLng(r)}
              icon={pinIcon(c?.color ?? '#888888', selectedId === r.id)}
              eventHandlers={{ click: () => onSelect(r.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {r.name}
              </Tooltip>
            </Marker>
          )
        })}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
