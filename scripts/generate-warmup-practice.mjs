// Genereert supabase/migrations/0005_warmup_practice.sql uit practice_questions.json
//
// Doel: de 52 losse oefen-meerkeuzevragen (geografie/migratie/talen) als
// warm-up-vragen in de database zetten (group_id = 'warmup'), naast de
// bestaande warm-up-vragen.
//
// Twee bewerkingen op de bron:
//   1) EQUALIZE - voor vragen waar het juiste antwoord veel langer/genuanceerder
//      was dan de afleiders (te makkelijk), zijn de opties herschreven zodat het
//      juiste antwoord niet meer opvalt door lengte. Zie OVERRIDES hieronder.
//   2) SHUFFLE  - het juiste antwoord wordt over de posities A/B/C/D verdeeld
//      (precies 13 per positie) met een vaste seed, zodat het niet langer bijna
//      altijd A of B is. De afleiders worden ook onderling geschud.
//
// De 'explanation' wordt opgeslagen in model_answer en na het antwoorden getoond.
// Em-dashes worden vervangen door gewone streepjes.
// Idempotent: upsert op id.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const src = JSON.parse(fs.readFileSync(join(root, 'practice_questions.json'), 'utf8'))
const out = join(root, 'supabase', 'migrations', '0005_warmup_practice.sql')

// Herschreven opties voor vragen waar het juiste antwoord te veel opviel.
// `correct` is de exacte juiste optie-string binnen `options`.
const OVERRIDES = {
  'pr-geo-04': {
    options: ['Monaco', 'Liechtenstein', 'Vaticaanstad', 'San Marino'],
    correct: 'Vaticaanstad',
  },
  'pr-mig-02': {
    options: [
      'Verspreiding of verstrooiing',
      'Terugkeer naar het vaderland',
      'Een streng bewaakte grens',
      'Versmelting tot één volk',
    ],
    correct: 'Verspreiding of verstrooiing',
  },
  'pr-mig-03': {
    options: ['Duitsland', 'Verenigde Staten', 'Saoedi-Arabië', 'Verenigd Koninkrijk'],
    correct: 'Verenigde Staten',
  },
  'pr-mig-04': {
    options: [
      'Afro-Amerikanen van het Zuiden naar het Noorden',
      'Ierse katholieken naar de steden van New England',
      'Mexicaanse arbeiders naar de velden van Californië',
      'Italiaanse families naar Lower Manhattan',
    ],
    correct: 'Afro-Amerikanen van het Zuiden naar het Noorden',
  },
  'pr-mig-05': {
    options: [
      'De aardappelhongersnood',
      'Een langdurige burgeroorlog',
      'Een reeks vulkaanuitbarstingen',
      'Een verwoestende pestepidemie',
    ],
    correct: 'De aardappelhongersnood',
  },
  'pr-mig-06': {
    options: [
      'Een vluchteling vlucht voor vervolging of gevaar',
      'Een vluchteling is altijd jonger dan een migrant',
      'Een vluchteling heeft per definitie geen papieren',
      'Een vluchteling vertrekt altijd vrijwillig',
    ],
    correct: 'Een vluchteling vlucht voor vervolging of gevaar',
  },
  'pr-mig-08': {
    options: ['~6 miljard dollar', '~65 miljard dollar', '~650 miljard dollar', '~6,5 biljoen dollar'],
    correct: '~650 miljard dollar',
  },
  'pr-mig-10': {
    options: [
      'De VS, met name New York',
      'Japan, met name Tokio',
      'Duitsland, met name Berlijn',
      'Egypte, met name Caïro',
    ],
    correct: 'De VS, met name New York',
  },
  'pr-mig-12': {
    options: [
      'Migranten halen familie en bekenden na',
      'Migratie die per boot wordt afgelegd',
      'Een door de staat gedwongen verhuizing',
      'Tijdelijke seizoensarbeid in het buitenland',
    ],
    correct: 'Migranten halen familie en bekenden na',
  },
  'pr-mig-17': {
    options: [
      'Zuid-Italië en Sicilië',
      'Lombardije en het noorden',
      'Toscane en Midden-Italië',
      'Veneto en de Alpenstreek',
    ],
    correct: 'Zuid-Italië en Sicilië',
  },
  'pr-tal-01': {
    options: ['Engels', 'Mandarijn-Chinees', 'Spaans (Castiliaans)', 'Hindi-Urdu'],
    correct: 'Mandarijn-Chinees',
  },
  'pr-tal-08': {
    options: ['West-Germaans', 'Romaanse talen', 'Keltische talen', 'Slavische talen'],
    correct: 'West-Germaans',
  },
  'pr-tal-12': {
    options: [
      'Een bewust bedachte kunsttaal',
      'Een uitgestorven dode taal',
      'Een regionaal dialect',
      'Een internationale gebarentaal',
    ],
    correct: 'Een bewust bedachte kunsttaal',
  },
  'pr-tal-14': {
    options: [
      'De Andes van Zuid-Amerika',
      'De kusten van Centraal-Amerika',
      'De eilanden van de Cariben',
      'De delta van de Amazone',
    ],
    correct: 'De Andes van Zuid-Amerika',
  },
  'pr-tal-15': {
    options: [
      'Een Australische Aboriginal-taal',
      'Het hedendaagse Frans',
      'Een afgelegen Scandinavische streektaal',
      'Het Europees Portugees',
    ],
    correct: 'Een Australische Aboriginal-taal',
  },
  'pr-tal-16': {
    options: [
      'Wisselen tussen talen binnen één gesprek',
      'Een tekst van de ene taal naar de andere vertalen',
      'Een eerder geleerde taal langzaam verleren',
      'Een geheime taal met je eigen groep spreken',
    ],
    correct: 'Wisselen tussen talen binnen één gesprek',
  },
  'pr-tal-17': {
    options: [
      'Duits, met Hebreeuwse en Slavische invloeden',
      'Russisch, met Duitse en Jiddische leenwoorden',
      'Pools met Duitse leenwoorden',
      'Uitsluitend klassiek Hebreeuws',
    ],
    correct: 'Duits, met Hebreeuwse en Slavische invloeden',
  },
}

// Vaste-seed RNG (mulberry32), zodat de uitvoer reproduceerbaar is.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260621)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const stripDashes = (s) => s.replace(/[—–]/g, '-')

// Bouw per vraag de "logische" lijst {options, correct, explanation}.
const items = src.questions.map((q) => {
  const ov = OVERRIDES[q.id]
  const options = (ov ? ov.options : q.options).map(stripDashes)
  const correct = ov ? stripDashes(ov.correct) : stripDashes(q.options[q.correctIndex])
  return { id: q.id, prompt: stripDashes(q.prompt), options, correct, explanation: stripDashes(q.explanation) }
})

// Gebalanceerde doelposities: precies 13x elk van 0..3, geschud (52 / 4 = 13).
const balanced = shuffle([0, 1, 2, 3].flatMap((i) => Array(items.length / 4).fill(i)))

const rows = items.map((item, i) => {
  const targetIdx = balanced[i]
  const distractors = shuffle(item.options.filter((o) => o !== item.correct))
  const finalOptions = []
  let d = 0
  for (let pos = 0; pos < 4; pos++) {
    finalOptions[pos] = pos === targetIdx ? item.correct : distractors[d++]
  }
  return { ...item, options: finalOptions, correctIndex: targetIdx, sort_order: 100 + i }
})

const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`)
const jsonb = (arr) => `'${JSON.stringify(arr).replace(/'/g, "''")}'::jsonb`

const sql = rows.map((r) => {
  const cols = [
    q(r.id),
    "'warmup'",
    "'mc'",
    q(r.prompt),
    jsonb(r.options),
    String(r.correctIndex),
    q(r.explanation), // model_answer = uitleg, getoond na antwoorden
    '1',
    'false',
    'false',
    String(r.sort_order),
    'true',
  ]
  return `insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values (${cols.join(
    ', ',
  )})\n  on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;`
})

const header = `-- =============================================================================
-- The Arrivals - 0005: 52 losse oefen-meerkeuzevragen als warm-up-vragen.
-- Bron: practice_questions.json (geografie/migratie/talen). Komen bovenop de
-- bestaande warm-up-vragen (group_id = 'warmup').
--   * Juiste antwoorden gelijkmatig over A/B/C/D verdeeld (13 per positie).
--   * Te 'makkelijke' vragen herschreven zodat het juiste antwoord niet opvalt.
--   * De uitleg staat in model_answer en wordt na het antwoorden getoond.
-- Draai dit in de Supabase SQL Editor. Idempotent: upsert op id.
-- =============================================================================

`

fs.writeFileSync(out, header + sql.join('\n') + '\n')

// Korte rapportage.
const dist = [0, 0, 0, 0]
let longest = 0
for (const r of rows) {
  dist[r.correctIndex]++
  const lens = r.options.map((o) => o.length)
  const m = Math.max(...lens)
  if (lens[r.correctIndex] === m && lens.filter((x) => x === m).length === 1) longest++
}
console.log(`Wrote ${rows.length} warm-up questions to ${out}`)
console.log('correctIndex distribution [0,1,2,3]:', dist)
console.log('correct-is-single-longest:', longest)
