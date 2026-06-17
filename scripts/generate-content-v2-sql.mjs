// Genereert supabase/migrations/0006_content_v2.sql uit content_seed.json (v2).
//
// Vervangt ALLE tour-content (stops, hun vragen, activiteiten) door v2 en zet de
// herziene meta-velden. Voegt nieuwe meta-kolommen toe (red_thread, mechanism,
// land_acknowledgement) en breidt de admin-RPC uit.
//
// BELANGRIJK - blijft ongemoeid:
//   * de warm-up-vragen (group_id = 'warmup'), incl. de 52 oefenvragen (pr-*)
//   * background_cards
//   * warmup_intro (door 0004 al naar de migratie-intro gezet)
//   * sessies / leaderboard
//
// Em-dashes worden vervangen door gewone streepjes (zoals 0003).
// Idempotent: deletes + upserts, opnieuw draaien is veilig.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const seed = JSON.parse(readFileSync(join(root, 'content_seed.json'), 'utf8'))
const out = join(root, 'supabase', 'migrations', '0006_content_v2.sql')

const dash = (v) => (typeof v === 'string' ? v.replace(/[—–]/g, '-') : v)
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(dash(v)).replace(/'/g, "''")}'`)
const b = (v) => (v ? 'true' : 'false')
const n = (v) => (v === null || v === undefined ? 'null' : Number(v))
const jsonb = (v) =>
  v === null || v === undefined
    ? 'null'
    : `'${JSON.stringify(v.map?.(dash) ?? v).replace(/'/g, "''")}'::jsonb`

const m = seed.meta
const lines = []

lines.push(`-- =============================================================================
-- The Arrivals - 0006: content v2 (11 stops, herziene rode draad, feitcorrecties).
-- Vervangt alle tour-content; warm-up (incl. 52 oefenvragen), cards en sessies
-- blijven ongemoeid. Draai dit in de Supabase SQL Editor. Idempotent.
-- =============================================================================

-- 1. Nieuwe meta-kolommen
alter table app_settings add column if not exists red_thread text;
alter table app_settings add column if not exists mechanism text;
alter table app_settings add column if not exists land_acknowledgement text;

-- 2. Admin-RPC uitbreiden met de nieuwe meta-velden
create or replace function admin_update_settings(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  update app_settings set
    title=coalesce(p_row->>'title',title), subtitle=p_row->>'subtitle',
    date=p_row->>'date', central_question=p_row->>'central_question',
    red_thread=p_row->>'red_thread', mechanism=p_row->>'mechanism',
    land_acknowledgement=p_row->>'land_acknowledgement',
    opening_line=p_row->>'opening_line', closing_line=p_row->>'closing_line',
    warmup_intro=coalesce(p_row->>'warmup_intro',warmup_intro),
    mc_points=coalesce(nullif(p_row->>'mc_points','')::int,mc_points),
    open_points=coalesce(nullif(p_row->>'open_points','')::int,open_points),
    timeline_note=p_row->>'timeline_note'
  where id=1;
end;
$$;
`)

// 3. Meta bijwerken (warmup_intro NIET aanraken - door 0004 al goed gezet)
lines.push(`-- 3. Herziene meta (warmup_intro blijft staan)
update app_settings set
  title = ${q(m.title)},
  subtitle = ${q(m.subtitle)},
  date = ${q(m.date)},
  central_question = ${q(m.redThread)},
  red_thread = ${q(m.redThread)},
  mechanism = ${q(m.mechanism)},
  land_acknowledgement = ${q(m.landAcknowledgement)},
  opening_line = ${q(m.openingLine)},
  closing_line = ${q(m.closingLine)},
  timeline_note = ${q(m.scoring.timelineNote)},
  mc_points = ${n(m.scoring.mcPoints)},
  open_points = ${n(m.scoring.openPoints)}
where id = 1;
`)

// 4. Oude tour-content wissen (warm-up blijft: group_id = 'warmup')
lines.push(`-- 4. Oude tour-vragen en activiteiten wissen
delete from questions where group_id like 's%';
delete from activities;
`)

// 5. Stops (upsert)
lines.push('-- 5. Stops (v2)')
seed.stops.forEach((s, si) => {
  const cols = `${q(s.id)}, ${n(s.number)}, ${q(s.name)}, ${b(s.optional)}, ${q(s.location)}, ${q(s.era)}, ${q(s.layer)}, ${q(s.food)}, ${q(s.intro)}, ${q(s.reveal)}, ${q(s.background)}, ${si}`
  lines.push(
    `insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values (${cols})\n  on conflict (id) do update set number=excluded.number, name=excluded.name, optional=excluded.optional, location=excluded.location, era=excluded.era, layer=excluded.layer, food=excluded.food, intro=excluded.intro, reveal=excluded.reveal, background=excluded.background, sort_order=excluded.sort_order;`,
  )
})

// 6. Tour-vragen (vers, want net verwijderd)
lines.push('\n-- 6. Tour-vragen (v2)')
seed.stops.forEach((s) => {
  ;(s.questions ?? []).forEach((qq, i) => lines.push(questionInsert(qq, s.id, i)))
})

// 7. Activiteiten
lines.push('\n-- 7. Activiteiten (v2)')
seed.stops.forEach((s) => {
  ;(s.activities ?? []).forEach((a, i) =>
    lines.push(
      `insert into activities (id, stop_id, title, body, sort_order) values (${q(a.id)}, ${q(s.id)}, ${q(a.title)}, ${q(a.body)}, ${i}) on conflict (id) do update set stop_id=excluded.stop_id, title=excluded.title, body=excluded.body, sort_order=excluded.sort_order;`,
    ),
  )
})

function questionInsert(qq, groupId, sort) {
  const cols = `${q(qq.id)}, ${q(groupId)}, ${q(qq.type)}, ${q(qq.prompt)}, ${jsonb(qq.options ?? null)}, ${n(qq.correctIndex)}, ${q(qq.modelAnswer)}, ${n(qq.points)}, ${b(qq.isTimeline)}, ${b(qq.discussion)}, ${sort}, true`
  return `insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values (${cols})\n  on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=true;`
}

writeFileSync(out, lines.join('\n') + '\n')

// Rapportage
const tlIds = seed.timelineQuestionIds
const tlFlags = seed.stops.flatMap((s) => s.questions ?? []).filter((x) => x.isTimeline).map((x) => x.id)
console.log(`Wrote ${out}`)
console.log(`Stops: ${seed.stops.length}`)
console.log(`Tour questions: ${seed.stops.reduce((a, s) => a + (s.questions?.length ?? 0), 0)}`)
console.log(`timelineQuestionIds (seed): ${tlIds.length} -> ${tlIds.join(', ')}`)
console.log(`isTimeline=true flags: ${tlFlags.length} -> ${tlFlags.join(', ')}`)
console.log(tlIds.length === tlFlags.length && tlIds.every((id) => tlFlags.includes(id))
  ? 'OK: timeline flags match timelineQuestionIds'
  : 'WARN: timeline mismatch')
