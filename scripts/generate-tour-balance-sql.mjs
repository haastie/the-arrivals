// Genereert supabase/migrations/0007_tour_question_balance.sql en patcht
// content_seed.json: herschrijft de 12 tour-meerkeuzevragen zodat
//   1) het juiste antwoord gelijkmatig over A/B/C/D staat (3 per positie i.p.v.
//      11x A), en
//   2) de afleiders qua lengte/nuance gelijkgetrokken zijn, zodat het juiste
//      antwoord niet opvalt door langer/genuanceerder te zijn.
// Alleen `options` en `correctIndex` veranderen; punten/isTimeline blijven gelijk.
//
// De opties staan hieronder in DEFINITIEVE volgorde (juiste op de gekozen index).
// Idempotent: UPDATE op id; opnieuw draaien is veilig.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const seedPath = join(root, 'content_seed.json')
const out = join(root, 'supabase', 'migrations', '0007_tour_question_balance.sql')

/** id -> { options (definitieve volgorde), correctIndex } */
const OVERRIDES = {
  's1-q2': {
    options: [
      'Voor welgestelde katholieke gezinnen; protestanten en Joden geweerd',
      'Voor iedereen met voldoende geld, ongeacht geloof of afkomst',
      'Voor witte protestanten; Joden, zwarte Amerikanen en katholieken geweerd',
      'Voor Ierse en Italiaanse fabrieksarbeiders; niet-Engelstaligen geweerd',
    ],
    correctIndex: 2,
  },
  's2-q2': {
    options: [
      'Colombiaanse en Mexicaanse nieuwkomers',
      'Joodse New Yorkers en homoseksuele mannen',
      'Tibetaanse en Nepalese families uit de Himalaya',
      'Ierse en Italiaanse fabrieksarbeiders',
    ],
    correctIndex: 1,
  },
  's3-q1': {
    options: [
      "Mexicanen, jaren '90",
      "Dominicanen, jaren '70",
      "Ecuadorianen, jaren '80",
      "Colombianen, jaren '50",
    ],
    correctIndex: 3,
  },
  's3-q2': {
    options: ['Ecuadorianen', 'Colombianen', 'Indiërs', 'Tibetanen'],
    correctIndex: 0,
  },
  's3-q3': {
    options: ['Tarwe', 'Rijst', 'Maïs', 'Gerst'],
    correctIndex: 2,
  },
  's4-q1': {
    options: ['~6 miljard dollar', '~65 miljard dollar', '~6,5 biljoen dollar', '~650 miljard dollar'],
    correctIndex: 3,
  },
  's5-q3': {
    options: [
      'Tijdens de Golfoorlog (1991)',
      'Na de aanslagen van 9/11 (2001)',
      'Na de val van de Berlijnse Muur (1989)',
      'Tijdens de COVID-pandemie (2020)',
    ],
    correctIndex: 1,
  },
  's5-q4': {
    options: [
      'De Partition van Brits-Indië',
      'Het einde van de Tweede Wereldoorlog',
      'De oprichting van de Verenigde Naties',
      'Een militaire staatsgreep in Delhi',
    ],
    correctIndex: 0,
  },
  's6-q1': {
    options: ['De Japanse', 'De Koreaanse', 'De Vietnamese', 'De Nepalese'],
    correctIndex: 3,
  },
  's6-q2': {
    options: [
      'Uitgenodigde gastarbeiders uit de regio',
      'Studenten op uitwisseling',
      'Vluchtelingen en politieke ballingen',
      'Seizoensarbeiders in de bouw',
    ],
    correctIndex: 2,
  },
  's7-q1': {
    options: [
      'Vanuit een klein eethuis',
      'Vanaf een straatkar op de hoek',
      'Op de wekelijkse Greenmarket',
      'Met een bestelbus langs de deur',
    ],
    correctIndex: 1,
  },
  's9-q1': {
    options: [
      'De COVID-pandemie (2020)',
      'De aanslagen van 9/11 (2001)',
      'De financiële crisis (2008)',
      'Orkaan Sandy (2012)',
    ],
    correctIndex: 0,
  },
}

const dash = (s) => s.replace(/[—–]/g, '-')
const optsJson = (arr) => JSON.stringify(arr.map(dash))
const sqlJsonb = (arr) => `'${optsJson(arr).replace(/'/g, "''")}'::jsonb`

// --- 1. SQL-migratie ---
const sqlLines = [
  `-- =============================================================================`,
  `-- The Arrivals - 0007: balanceer de tour-meerkeuzevragen.`,
  `-- Juiste antwoorden gelijkmatig over A/B/C/D (was 11x A) en afleiders`,
  `-- qua lengte/nuance gelijkgetrokken. Alleen options + correct_index wijzigen.`,
  `-- Draai in de Supabase SQL Editor. Idempotent.`,
  `-- =============================================================================`,
  ``,
]
for (const [id, o] of Object.entries(OVERRIDES)) {
  sqlLines.push(
    `update questions set options = ${sqlJsonb(o.options)}, correct_index = ${o.correctIndex} where id = '${id}';`,
  )
}
writeFileSync(out, sqlLines.join('\n') + '\n')

// --- 2. content_seed.json patchen (regel per vraag) ---
let seedText = readFileSync(seedPath, 'utf8')
const seedLines = seedText.split('\n').map((line) => {
  const m = line.match(/"id":\s*"([^"]+)"/)
  if (!m || !OVERRIDES[m[1]]) return line
  const o = OVERRIDES[m[1]]
  return line
    .replace(/("options":\s*)\[[^\]]*\]/, `$1${optsJson(o.options)}`)
    .replace(/("correctIndex":\s*)\d+/, `$1${o.correctIndex}`)
})
writeFileSync(seedPath, seedLines.join('\n'))

// --- 3. Verificatie ---
const dist = [0, 0, 0, 0]
let longest = 0
for (const o of Object.values(OVERRIDES)) {
  dist[o.correctIndex]++
  const l = o.options.map((x) => x.length)
  const m = Math.max(...l)
  if (l[o.correctIndex] === m && l.filter((x) => x === m).length === 1) longest++
}
console.log(`Wrote ${out} and patched content_seed.json`)
console.log(`MC questions: ${Object.keys(OVERRIDES).length}`)
console.log(`correctIndex distribution [0,1,2,3]: ${JSON.stringify(dist)}`)
console.log(`correct = single longest option: ${longest}`)
