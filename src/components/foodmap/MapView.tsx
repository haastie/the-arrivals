import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
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
    const d = selected ? 22 : 14
    icon = L.divIcon({
      className: '',
      html: `<span style="display:block;width:${d}px;height:${d}px;border-radius:50%;background:${color};border:2px solid #0a0e17;box-shadow:${
        selected ? `0 0 0 3px ${color}` : '0 1px 4px rgba(0,0,0,.6)'
      }"></span>`,
      iconSize: [d, d],
      iconAnchor: [d / 2, d / 2],
    })
    iconCache.set(key, icon)
  }
  return icon
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
    <div className="h-[60vh] overflow-hidden rounded-3xl border border-paper/10">
      <MapContainer
        center={JH_CENTER}
        zoom={15}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', background: '#0a0e17' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MarkerClusterGroup chunkedLoading>
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
    </div>
  )
}
