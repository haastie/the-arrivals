#!/usr/bin/env node
/**
 * scrape-restaurants.mjs - vult de `restaurants`-tabel met (bijna) heel Jackson
 * Heights via de Yelp Fusion API, verrijkt met Claude, en schrijft naar Supabase.
 *
 * PIJPLIJN
 *   1. Yelp business search per TEGEL (klein zoekgebied). Yelp staat max 240
 *      resultaten per zoekopdracht toe (limit+offset <= 240), dus we dekken JH
 *      met een raster van overlappende tegels, genummerd vanaf het hart van de
 *      buurt (37th Ave & 81st St) naar buiten. Resultaten worden ontdubbeld.
 *   2. Heuristische classificatie: Yelp-categorie -> community + taalgroep.
 *   3. Claude-verrijking (optioneel): leest reviews en schrijft community/taal,
 *      `consensus`, `dish` en 2 `quotes` (in het Nederlands).
 *   4. Upsert in Supabase (service-role) op id = "yelp-<businessId>".
 *
 * ENV (in .env.local in de projectroot - wordt automatisch ingeladen - of in je shell):
 *   YELP_API_KEY                 - https://www.yelp.com/developers (gratis)
 *   ANTHROPIC_API_KEY            - voor de verrijking (sla over met --no-enrich)
 *   SUPABASE_URL                 - bv. https://lsagvpllpdouwwjmiwrz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    - service role (omzeilt RLS) - geheim!
 *
 * GEBRUIK
 *   node scripts/scrape-restaurants.mjs --list-tiles    # toon het tegelraster
 *   node scripts/scrape-restaurants.mjs --tile 1        # alleen tegel 1 (centrum)
 *   node scripts/scrape-restaurants.mjs --tile 1-6      # tegels 1 t/m 6
 *   node scripts/scrape-restaurants.mjs                 # alle tegels -> Supabase
 *   node scripts/scrape-restaurants.mjs --no-enrich     # zonder Claude
 *   node scripts/scrape-restaurants.mjs --dry-run       # schrijf SQL i.p.v. DB
 *   node scripts/scrape-restaurants.mjs --model claude-haiku-4-5-20251001
 *
 * Tegels zijn genummerd vanaf het centrum (37th Ave & 81st St) naar buiten:
 * lage nummers = hart van Jackson Heights, hoge nummers = de randen. Draai een
 * paar lage nummers eerst en breid uit. Ontdubbeling via id = "yelp-<id>" zorgt
 * dat overlappende tegels elkaar niet dubbel opslaan.
 *
 * Vereist Node 18+ (global fetch). Draai eerst migraties 0008 + 0009.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// .env.local / .env inladen (Node leest die niet vanzelf, Vite wel).
function loadEnvFiles() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  for (const name of ['.env.local', '.env']) {
    const path = join(root, name)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 0) continue
      const key = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = v
    }
  }
}
loadEnvFiles()

// ---- args & env ------------------------------------------------------------
const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const val = (f, d) => {
  const i = args.indexOf(f)
  return i >= 0 && args[i + 1] ? args[i + 1] : d
}
const DRY = has('--dry-run')
const ENRICH = !has('--no-enrich')
const LIMIT = Number(val('--limit', '2000'))
const MODEL = val('--model', 'claude-haiku-4-5-20251001')
const LIST_TILES = has('--list-tiles')
const TILE_ARG = val('--tile', null) // "1", "1-6" of leeg = alle tegels

const { YELP_API_KEY, ANTHROPIC_API_KEY } = process.env
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!YELP_API_KEY) fail('Zet YELP_API_KEY in je env.')
if (ENRICH && !ANTHROPIC_API_KEY) fail('Zet ANTHROPIC_API_KEY (of gebruik --no-enrich).')
if (!DRY && (!SUPABASE_URL || !SERVICE_KEY)) fail('Zet SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (of gebruik --dry-run).')

function fail(m) {
  console.error('FOUT: ' + m)
  process.exit(1)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- Jackson Heights gebied ------------------------------------------------
const JH = { lat: 40.7488, lng: -73.8839, bbox: { minLat: 40.743, maxLat: 40.761, minLng: -73.918, maxLng: -73.872 } }
const inBox = (la, ln) =>
  la >= JH.bbox.minLat && la <= JH.bbox.maxLat && ln >= JH.bbox.minLng && ln <= JH.bbox.maxLng

// ---- tegelraster -----------------------------------------------------------
// Yelp geeft max 240 resultaten per zoekopdracht (limit+offset <= 240). Daarom
// dekken we de buurt met overlappende tegels met een kleine zoekradius. Het
// raster is verankerd op het hart van Jackson Heights (37th Ave & 81st St) en
// genummerd vanaf het centrum naar buiten.
const CENTER = { lat: 40.7489, lng: -73.8853 } // 37th Ave & 81st St
const TILE_RADIUS = 500 // meter (zoekradius per tegel)
const LAT_STEP = 0.005 // ~555 m
const LNG_STEP = 0.0065 // ~550 m op deze breedtegraad

function buildTiles() {
  const pts = []
  const latSpan = Math.ceil((JH.bbox.maxLat - JH.bbox.minLat) / LAT_STEP) + 1
  const lngSpan = Math.ceil((JH.bbox.maxLng - JH.bbox.minLng) / LNG_STEP) + 1
  for (let i = -latSpan; i <= latSpan; i++) {
    for (let j = -lngSpan; j <= lngSpan; j++) {
      const lat = CENTER.lat + i * LAT_STEP
      const lng = CENTER.lng + j * LNG_STEP
      // houd tegelcentra binnen (net iets ruimer dan) de bbox
      if (lat < JH.bbox.minLat - LAT_STEP / 2 || lat > JH.bbox.maxLat + LAT_STEP / 2) continue
      if (lng < JH.bbox.minLng - LNG_STEP / 2 || lng > JH.bbox.maxLng + LNG_STEP / 2) continue
      pts.push({ lat: +lat.toFixed(5), lng: +lng.toFixed(5) })
    }
  }
  // sorteer op afstand tot het centrum (breedtegraad-gecorrigeerd)
  const cos = Math.cos((CENTER.lat * Math.PI) / 180)
  const dist2 = (p) => {
    const dl = p.lat - CENTER.lat
    const dn = (p.lng - CENTER.lng) * cos
    return dl * dl + dn * dn
  }
  pts.sort((a, b) => dist2(a) - dist2(b))
  return pts.map((p, idx) => ({ n: idx + 1, ...p }))
}

// "3" -> [3]; "1-6" -> [1..6]; leeg -> alle
function selectTiles(tiles) {
  if (!TILE_ARG) return tiles
  const m = String(TILE_ARG).match(/^(\d+)(?:-(\d+))?$/)
  if (!m) fail(`Ongeldige --tile waarde: ${TILE_ARG} (gebruik bv. 3 of 1-6).`)
  const from = Number(m[1])
  const to = m[2] ? Number(m[2]) : from
  return tiles.filter((t) => t.n >= from && t.n <= to)
}

// Spiegelt src/data/jacksonHeightsMap.ts (xyToLatLng) zodat de fallback-x/y klopt.
function latLngToXY(lat, lng) {
  const x = 30 + (lng + 73.8916) / 0.000385
  const y = 16 + (lat - 40.7556) / -0.0001452
  return [clamp(x), clamp(y)]
}
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n * 10) / 10))

// ---- categorie -> community + taal (heuristiek) ----------------------------
const COMMUNITIES = ['south_asian', 'himalayan', 'colombian', 'mexican', 'ecuadorian', 'lgbtq']
const LANGS = ['hindi', 'bengali', 'nepali', 'tibetan', 'spanish']

function classify(aliases, title) {
  const a = aliases.join(' ') + ' ' + title.toLowerCase()
  const hit = (...keys) => keys.some((k) => a.includes(k))
  if (hit('tibetan')) return { community: 'himalayan', lang: 'tibetan' }
  if (hit('nepalese', 'himalayan', 'newari', 'sherpa')) return { community: 'himalayan', lang: 'nepali' }
  if (hit('bangladeshi')) return { community: 'south_asian', lang: 'bengali' }
  if (hit('indpak', 'indian', 'pakistani', 'gujarati', 'punjabi', 'hyderabad')) return { community: 'south_asian', lang: 'hindi' }
  if (hit('colombian')) return { community: 'colombian', lang: 'spanish' }
  if (hit('ecuadorian')) return { community: 'ecuadorian', lang: 'spanish' }
  if (hit('mexican', 'tacos', 'pueblan')) return { community: 'mexican', lang: 'spanish' }
  if (hit('gaybars', 'gay_bars')) return { community: 'lgbtq', lang: 'spanish' }
  if (hit('latin', 'venezuelan', 'peruvian', 'argentine', 'dominican', 'cuban', 'spanish')) return { community: 'colombian', lang: 'spanish' }
  return { community: null, lang: null }
}

// ---- Yelp ------------------------------------------------------------------
async function yelp(path, params) {
  const url = new URL('https://api.yelp.com/v3' + path)
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url, { headers: { Authorization: `Bearer ${YELP_API_KEY}` } })
  if (!res.ok) throw new Error(`Yelp ${res.status}: ${await res.text()}`)
  return res.json()
}

// Eén tegel uitlezen. Binnen één tegel paginerend tot offset 200 (limit 40 ->
// 240 totaal, precies de Yelp-limiet). Met de kleine radius is dat ruim genoeg.
async function discoverTile(tile, seen) {
  let added = 0
  for (let offset = 0; offset <= 200 && seen.size < LIMIT; offset += 40) {
    let data
    try {
      data = await yelp('/businesses/search', {
        latitude: tile.lat, longitude: tile.lng, radius: TILE_RADIUS,
        categories: 'restaurants,food,bars', limit: 40, offset, sort_by: 'distance',
      })
    } catch (e) {
      console.warn(`  tegel ${tile.n} pagina overslaan (offset ${offset}): ${e.message}`)
      break
    }
    const list = data.businesses || []
    if (!list.length) break
    for (const b of list) {
      const la = b.coordinates?.latitude, ln = b.coordinates?.longitude
      if (la == null || ln == null || !inBox(la, ln) || b.is_closed) continue
      if (!seen.has(b.id)) {
        seen.set(b.id, b)
        added++
      }
    }
    if (list.length < 40) break // laatste pagina van deze tegel
    await sleep(120)
  }
  return added
}

async function discover(tiles) {
  const seen = new Map()
  for (const tile of tiles) {
    if (seen.size >= LIMIT) break
    const added = await discoverTile(tile, seen)
    console.log(`  tegel ${tile.n} (${tile.lat}, ${tile.lng}): +${added} nieuw (totaal ${seen.size})`)
  }
  return [...seen.values()].slice(0, LIMIT)
}

// ---- Claude-verrijking -----------------------------------------------------
async function reviewsFor(id) {
  try {
    const d = await yelp(`/businesses/${id}/reviews`, { limit: 3, sort_by: 'yelp_sort' })
    return (d.reviews || []).map((r) => r.text).filter(Boolean)
  } catch {
    return []
  }
}

async function enrich(b, guess, reviews) {
  const prompt = `Je bent een lokale eetgids voor Jackson Heights, Queens. Gegeven een restaurant, geef JSON terug.
Restaurant: ${b.name}
Categorieën: ${(b.categories || []).map((c) => c.title).join(', ')}
Rating: ${b.rating} (${b.review_count} reviews)
Reviews:
${reviews.map((r, i) => `${i + 1}. ${r}`).join('\n') || '(geen)'}

Kies community_id uit: ${COMMUNITIES.join(', ')} (lgbtq alleen voor queer bars/clubs).
Kies lang_group uit: ${LANGS.join(', ')} (de taal die je in de zaak hoort).
Geef ALLEEN dit JSON-object terug (Nederlands, geen markdown):
{"community_id":"...","lang_group":"...","consensus":"1-2 zinnen","dish":"aanbevolen gerecht","quotes":[{"text":"kort citaat","source":"Yelp-reviewer"}]}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data = await res.json()
    const text = data.content?.map((c) => c.text).join('') || ''
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    return {
      community_id: COMMUNITIES.includes(json.community_id) ? json.community_id : guess.community,
      lang_group: LANGS.includes(json.lang_group) ? json.lang_group : guess.lang,
      consensus: String(json.consensus || ''),
      dish: String(json.dish || ''),
      quotes: Array.isArray(json.quotes) ? json.quotes.slice(0, 2) : [],
    }
  } catch (e) {
    console.warn('  verrijking mislukt voor ' + b.name + ': ' + e.message)
    return null
  }
}

// ---- main ------------------------------------------------------------------
function toRow(b, cls, i) {
  const la = b.coordinates.latitude, ln = b.coordinates.longitude
  const [x, y] = latLngToXY(la, ln)
  return {
    id: 'yelp-' + b.id,
    name: b.name,
    community_id: cls.community_id || 'colombian',
    cuisine: (b.categories || [])[0]?.title || '',
    price: b.price || '',
    address: (b.location?.display_address || []).join(', '),
    x, y, lat: la, lng: ln,
    lang_group: cls.lang_group || 'spanish',
    tour: null,
    rating: b.rating ?? null,
    rating_count: b.review_count ?? null,
    rating_source: 'Yelp',
    consensus: cls.consensus || '',
    dish: cls.dish || '',
    dish_source: cls.dish ? 'Yelp reviews' : '',
    quotes: cls.quotes || [],
    yelp_id: b.id,
    source: 'yelp',
    photo_url: b.image_url || null,
    sort_order: 1000 + i,
    active: true,
  }
}

async function main() {
  const tiles = buildTiles()

  if (LIST_TILES) {
    console.log(`Tegelraster (${tiles.length} tegels, radius ${TILE_RADIUS} m, centrum 37th Ave & 81st St):`)
    for (const t of tiles) {
      const km = (Math.hypot((t.lat - CENTER.lat) * 111, (t.lng - CENTER.lng) * 84)).toFixed(2)
      console.log(`  ${String(t.n).padStart(3)}  lat ${t.lat}  lng ${t.lng}  (~${km} km vanaf centrum)`)
    }
    console.log('\nDraai bv.:  node scripts/scrape-restaurants.mjs --tile 1-6 --dry-run')
    return
  }

  const selected = selectTiles(tiles)
  const scope = TILE_ARG ? `tegel(s) ${TILE_ARG} van ${tiles.length}` : `alle ${tiles.length} tegels`
  console.log(`Yelp: zoeken in Jackson Heights (${scope})…`)
  const businesses = await discover(selected)
  console.log(`Gevonden: ${businesses.length} unieke zaken binnen de JH-box.`)

  const rows = []
  for (let i = 0; i < businesses.length; i++) {
    const b = businesses[i]
    const guess = classify((b.categories || []).map((c) => c.alias), b.name)
    let cls = { community_id: guess.community, lang_group: guess.lang, consensus: '', dish: '', quotes: [] }
    if (ENRICH) {
      const reviews = await reviewsFor(b.id)
      const e = await enrich(b, guess, reviews)
      if (e) cls = e
      await sleep(250)
    }
    rows.push(toRow(b, cls, i))
    if ((i + 1) % 20 === 0) console.log(`  verwerkt ${i + 1}/${businesses.length}`)
  }

  if (DRY) {
    const sql = rows.map(rowToSql).join('\n') + '\n'
    const suffix = TILE_ARG ? `_tile_${String(TILE_ARG).replace(/[^0-9-]/g, '')}` : ''
    const out = `supabase/migrations/0010_restaurants_scraped${suffix}.sql`
    writeFileSync(out, '-- Gescrapete restaurants (Yelp). Idempotent.\n' + sql)
    console.log(`DRY-RUN: ${rows.length} rijen geschreven naar ${out}`)
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error } = await supabase.from('restaurants').upsert(chunk, { onConflict: 'id' })
    if (error) fail('Supabase upsert: ' + error.message)
    console.log(`  geüpload ${Math.min(i + 100, rows.length)}/${rows.length}`)
  }
  console.log(`Klaar. ${rows.length} restaurants live in de DB.`)
}

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const num = (v) => (v === null || v === undefined ? 'null' : Number(v))
function rowToSql(r) {
  const cols = [
    q(r.id), q(r.name), q(r.community_id), q(r.cuisine), q(r.price), q(r.address),
    num(r.x), num(r.y), num(r.lat), num(r.lng), q(r.lang_group), 'null',
    num(r.rating), num(r.rating_count), q(r.rating_source), q(r.consensus), q(r.dish), q(r.dish_source),
    `'${JSON.stringify(r.quotes).replace(/'/g, "''")}'::jsonb`, q(r.yelp_id), q(r.source), q(r.photo_url),
    num(r.sort_order), 'true',
  ]
  return `insert into restaurants (id, name, community_id, cuisine, price, address, x, y, lat, lng, lang_group, tour, rating, rating_count, rating_source, consensus, dish, dish_source, quotes, yelp_id, source, photo_url, sort_order, active) values (${cols.join(', ')}) on conflict (id) do update set name=excluded.name, community_id=excluded.community_id, cuisine=excluded.cuisine, price=excluded.price, address=excluded.address, lat=excluded.lat, lng=excluded.lng, lang_group=excluded.lang_group, rating=excluded.rating, rating_count=excluded.rating_count, consensus=excluded.consensus, dish=excluded.dish, dish_source=excluded.dish_source, quotes=excluded.quotes, yelp_id=excluded.yelp_id, source=excluded.source, photo_url=excluded.photo_url;`
}

main().catch((e) => fail(e.message))
