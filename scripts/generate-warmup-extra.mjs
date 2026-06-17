// Genereert supabase/migrations/0005_warmup_extra.sql
//
// Zet ALLE quizvragen (de oorspronkelijke warm-up + alle stop-vragen) in de
// warm-up-pool (group_id = 'warmup'). De stop-vragen krijgen een nieuw, eigen id
// met prefix "wu-" zodat de live-tour-vragen (group_id = 's1'..'s9') intact
// blijven. Voor de meerkeuzevragen zijn:
//   1) de juiste antwoorden over de posities verspreid (niet meer telkens A), en
//   2) de afleiders qua lengte/nuance gelijkgetrokken, zodat het juiste antwoord
//      niet opvalt doordat het langer of genuanceerder is.
// Open vragen gaan mee zoals ze zijn (in de warm-up tellen ze niet mee).
//
// Idempotent: upsert op id (on conflict do update).

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'supabase', 'migrations', '0005_warmup_extra.sql')

/** @type {Array<{id:string,type:'mc'|'open',prompt:string,options?:string[],correctIndex?:number,modelAnswer?:string}>} */
const questions = [
  // ---- Meerkeuze (afleiders gelijkgetrokken, juiste antwoord verschoven) ----
  {
    id: 'wu-q1', type: 'mc',
    prompt: 'In welk stadsdeel van New York ligt Jackson Heights?',
    options: ['Brooklyn', 'Manhattan', 'Queens', 'The Bronx'],
    correctIndex: 2,
  },
  {
    id: 'wu-q2', type: 'mc',
    prompt: 'Hoeveel talen worden er naar schatting in Jackson Heights gesproken?',
    options: ['Rond de 40', 'Meer dan 160', 'Rond de 90', 'Meer dan 280'],
    correctIndex: 1,
  },
  {
    id: 'wu-q3', type: 'mc',
    prompt: "Welke metrolijn heet 'the International Express'?",
    options: ['De 1', 'De A', 'De L', 'De 7'],
    correctIndex: 3,
  },
  {
    id: 'wu-q4', type: 'mc',
    prompt: "Wat is een 'palimpsest'?",
    options: [
      'Perkament dat is afgekrabd en opnieuw beschreven, met de oude tekst eronder',
      'Een oude landkaart waarop allang verdwenen straten nog vaag doorschemeren',
      'Een muur waarop oude en nieuwe affiches jarenlang over elkaar heen plakken',
      'Een gerecht waarin de restjes van eerdere dagen telkens opnieuw verwerkt worden',
    ],
    correctIndex: 0,
  },
  {
    id: 'wu-s1-q2', type: 'mc',
    prompt: 'Welke groepen mochten hier oorspronkelijk volgens de aktes niet wonen?',
    options: [
      'Ieren en Italiaanse katholieken',
      'Aziatische en Latijns-Amerikaanse migranten',
      'Arbeiders zonder vast inkomen',
      'Joden en zwarte Amerikanen',
    ],
    correctIndex: 3,
  },
  {
    id: 'wu-s2-q2', type: 'mc',
    prompt: "Welke twee groepen 'lekten' als eerste de witte utopie binnen in de jaren '40?",
    options: [
      'Colombiaanse en Mexicaanse nieuwkomers',
      'Tibetaanse en Nepalese families uit de Himalaya',
      'Joodse New Yorkers en homoseksuele mannen',
      'Ierse en Italiaanse fabrieksarbeiders',
    ],
    correctIndex: 2,
  },
  {
    id: 'wu-s3-q1', type: 'mc',
    prompt: 'Welke Latino-gemeenschap kwam als eerste, en in welk decennium?',
    options: [
      "Mexicanen, jaren '90",
      "Colombianen, jaren '50",
      "Dominicanen, jaren '70",
      "Ecuadorianen, jaren '80",
    ],
    correctIndex: 1,
  },
  {
    id: 'wu-s3-q2', type: 'mc',
    prompt: 'Proef de arepa. Van welk graan is hij gemaakt?',
    options: ['Tarwe', 'Rijst', 'Gerst', 'Maïs'],
    correctIndex: 3,
  },
  {
    id: 'wu-s4-q2', type: 'mc',
    prompt: 'Welk type beroep hadden veel van de eerste Indiase migranten, en waarom?',
    options: [
      'Landarbeiders, omdat er volop vraag was naar seizoenswerk op het land',
      'Artsen en ingenieurs, want de wet gaf voorrang aan hooggeschoolden',
      'Zeelieden, aangemonsterd via de haven van New York',
      'Studenten, via een internationaal uitwisselingsprogramma',
    ],
    correctIndex: 1,
  },
  {
    id: 'wu-s4-q3', type: 'mc',
    prompt: 'Welke gebeurtenis maakte India en Pakistan in 1947 tot aparte landen?',
    options: [
      'Het einde van de Tweede Wereldoorlog',
      'De oprichting van de Verenigde Naties',
      'De Partition van Brits-Indië',
      'Een militaire staatsgreep in Delhi',
    ],
    correctIndex: 2,
  },
  {
    id: 'wu-s5-q2', type: 'mc',
    prompt: 'Veel Tibetanen hier zijn niet zomaar migranten, maar iets specifiekers. Wat?',
    options: [
      'Vluchtelingen en politieke ballingen',
      'Uitgenodigde gastarbeiders uit de regio',
      'Studenten op een uitwisseling',
      'Seizoensarbeiders in de horeca',
    ],
    correctIndex: 0,
  },
  {
    id: 'wu-s6-q1', type: 'mc',
    prompt: "Hoe verkocht de Arepa Lady (María Piedad Cano) haar arepa's oorspronkelijk?",
    options: [
      'Vanuit een klein eethuis',
      'Op de wekelijkse Greenmarket',
      'Vanaf een straatkar op de hoek',
      'Met een bestelbus langs de deur',
    ],
    correctIndex: 2,
  },
  {
    id: 'wu-s8-q1', type: 'mc',
    prompt: "Tijdens welke wereldgebeurtenis werd deze straat een 'superblock'?",
    options: [
      'De COVID-pandemie (2020)',
      'De aanslagen van 9/11 (2001)',
      'De financiële crisis (2008)',
      'Orkaan Sandy (2012)',
    ],
    correctIndex: 0,
  },

  // ---- Open vragen (gaan mee in de warm-up; tellen daar niet mee) ----
  {
    id: 'wu-q5', type: 'open',
    prompt: 'Wat verwacht je van een buurt met meer dan 160 talen? Schrijf in één zin wat je nieuwsgierig maakt.',
    modelAnswer: 'Geen goed/fout - beoordeel op betrokkenheid; iedereen die iets zinnigs schrijft verdient het punt.',
  },
  {
    id: 'wu-s1-q1', type: 'open',
    prompt: "Deze buurt heet 'Heights'. Hoe hoog ligt het hoogste punt, en waarom heet het dan zo?",
    modelAnswer: "Het is plat (oud weiland 'Trains Meadow'); 'Heights' is marketing om prestige te suggereren.",
  },
  {
    id: 'wu-s2-q1', type: 'open',
    prompt: 'Welk wereldberoemd bordspel is hier in 1938 bedacht, en wat was het beroep van de bedenker?',
    modelAnswer: 'Scrabble; de bedenker (Alfred Butts) was een werkloze architect.',
  },
  {
    id: 'wu-s3-q3', type: 'open',
    prompt: "Terraza-eigenaar Freddy Castiblanco noemt zijn zaak 'verzet'. Verzet tegen wat?",
    modelAnswer: 'Tegen gentrificatie / verdringing van de gemeenschap.',
  },
  {
    id: 'wu-s4-q1', type: 'open',
    prompt: 'Eén wet uit één jaar verklaart bijna alle migratie hier. Welk jaar, en wat deed die wet?',
    modelAnswer: '1965, de Immigration & Nationality Act (Hart-Celler): schrapte de raciale nationale quota en opende migratie uit Azië.',
  },
  {
    id: 'wu-s5-q1', type: 'open',
    prompt: "Dat filmpaleis heette 'The Earle', daarna 'The Eagle'. Wat veranderden de eigenaren, en waarom maar dát?",
    modelAnswer: 'Eén letter (Earle naar Eagle), om kosten te sparen; ze wilden niet in een heel nieuw bord investeren.',
  },
  {
    id: 'wu-s6-q2', type: 'open',
    prompt: 'Een oud-stadsplanner vergeleek gentrificatie met cholesterol. Wat bedoelde ze?',
    modelAnswer: 'Dat er goede én slechte gentrificatie bestaat (goede = inkomensdiversiteit; slechte = verdringing).',
  },
  {
    id: 'wu-s7-q1', type: 'open',
    prompt: 'Naar wie is de hoek 78th St & 37th Ave vernoemd, en welke jaarlijkse gebeurtenis komt voort uit zijn dood in 1990?',
    modelAnswer: 'Julio Rivera; de Queens Pride Parade (opgericht door Danny Dromm).',
  },
]

const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`)
const jsonb = (arr) => (arr == null ? 'null' : `'${JSON.stringify(arr).replace(/'/g, "''")}'::jsonb`)

const rows = questions.map((item, i) => {
  const cols = [
    q(item.id),
    "'warmup'",
    q(item.type),
    q(item.prompt),
    item.type === 'mc' ? jsonb(item.options) : 'null',
    item.type === 'mc' ? String(item.correctIndex) : 'null',
    item.modelAnswer ? q(item.modelAnswer) : 'null',
    '1', // points
    'false', // is_timeline
    'false', // discussion
    String(i), // sort_order
    'true', // active
  ]
  return `insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values (${cols.join(
    ', ',
  )})\n  on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;`
})

const header = `-- =============================================================================
-- The Arrivals - 0005: volledige warm-up-vragenpool.
-- Alle quizvragen (oorspronkelijke warm-up + alle stop-vragen) staan hier als
-- warm-up-vragen (group_id = 'warmup'). Stop-vragen kregen een nieuw id met
-- prefix 'wu-' zodat de live-tour-vragen ongemoeid blijven.
-- Meerkeuze: juiste antwoorden verspreid over de posities, afleiders qua lengte
-- en nuance gelijkgetrokken. Draai dit in de Supabase SQL Editor.
-- Idempotent: upsert op id, opnieuw draaien is veilig.
-- =============================================================================

`

writeFileSync(out, header + rows.join('\n') + '\n')
console.log(`Wrote ${questions.length} warm-up questions to ${out}`)
