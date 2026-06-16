// Genereert SQL-INSERTs voor de content-tabellen uit content_seed.json.
// Gebruik: node scripts/generate-seed-sql.mjs > /tmp/seed.sql
import { readFileSync } from 'node:fs'

const seed = JSON.parse(readFileSync(new URL('../content_seed.json', import.meta.url), 'utf8'))

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const b = (v) => (v ? 'true' : 'false')
const n = (v) => (v === null || v === undefined ? 'null' : Number(v))
const jsonb = (v) =>
  v === null || v === undefined ? 'null' : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`

const lines = []

// app_settings (singleton id = 1)
const m = seed.meta
lines.push(
  `insert into app_settings (id, title, subtitle, language, date, central_question, opening_line, closing_line, warmup_intro, mc_points, open_points, timeline_note) values (1, ${q(m.title)}, ${q(m.subtitle)}, ${q(m.language)}, ${q(m.date)}, ${q(m.centralQuestion)}, ${q(m.openingLine)}, ${q(m.closingLine)}, ${q(seed.warmup.intro)}, ${n(m.scoring.mcPoints)}, ${n(m.scoring.openPoints)}, ${q(m.scoring.timelineNote)}) on conflict (id) do nothing;`,
)

// background_cards
seed.warmup.backgroundCards.forEach((c, i) => {
  lines.push(
    `insert into background_cards (id, title, body, sort_order) values (${q(c.id)}, ${q(c.title)}, ${q(c.body)}, ${i}) on conflict (id) do nothing;`,
  )
})

// warm-up questions (group_id = 'warmup')
seed.warmup.questions.forEach((qq, i) => {
  lines.push(questionInsert(qq, 'warmup', i))
})

// stops + their questions + activities
seed.stops.forEach((s, si) => {
  lines.push(
    `insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values (${q(s.id)}, ${n(s.number)}, ${q(s.name)}, ${b(s.optional)}, ${q(s.location)}, ${q(s.era)}, ${q(s.layer)}, ${q(s.food)}, ${q(s.intro)}, ${q(s.reveal)}, ${q(s.background)}, ${si}) on conflict (id) do nothing;`,
  )
  ;(s.questions ?? []).forEach((qq, i) => lines.push(questionInsert(qq, s.id, i)))
  ;(s.activities ?? []).forEach((a, i) =>
    lines.push(
      `insert into activities (id, stop_id, title, body, sort_order) values (${q(a.id)}, ${q(s.id)}, ${q(a.title)}, ${q(a.body)}, ${i}) on conflict (id) do nothing;`,
    ),
  )
})

function questionInsert(qq, groupId, sort) {
  return `insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values (${q(qq.id)}, ${q(groupId)}, ${q(qq.type)}, ${q(qq.prompt)}, ${jsonb(qq.options ?? null)}, ${n(qq.correctIndex)}, ${q(qq.modelAnswer)}, ${n(qq.points)}, ${b(qq.isTimeline)}, ${b(qq.discussion)}, ${sort}, true) on conflict (id) do nothing;`
}

process.stdout.write(lines.join('\n') + '\n')
