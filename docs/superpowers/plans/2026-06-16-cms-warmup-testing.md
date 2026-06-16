# Database-CMS, sessie-loze warm-up & testbaarheid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verhuis alle content van de statische `content_seed.json` naar een Supabase-database met een geheime-link `/admin` CMS, voeg een sessie-loze `/warmup`-oefenpagina toe, en maak de live-flow solo testbaar.

**Architecture:** De DB wordt de bron van waarheid voor content. Een `ContentProvider` haalt alle content op en levert exact dezelfde `Content`-objectvorm als de huidige seed, zodat bestaande componenten alleen hun bron wisselen (import → `useContent()`). Schrijfacties op content lopen via `SECURITY DEFINER`-RPC's die een `admin_secret` verifiëren (zelfde patroon als `host_secret`). Scoring leest `correct_index`/`points` voortaan uit de DB. Een aparte `/warmup`-route scoort lokaal zonder sessie.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind v4, react-router, @supabase/supabase-js, Vitest (nieuw, voor logica-tests).

---

## Bestandsoverzicht

**Nieuw:**
- `scripts/generate-seed-sql.mjs` — genereert `0002`-seed-INSERTs uit `content_seed.json` (correcte escaping).
- `supabase/migrations/0002_cms.sql` — content-tabellen, `admin_config`, RLS/grants, admin+test-RPC's, herdefinitie van `host_reveal_mc`/`host_judge_open`, drop `submit_warmup_answer`, en de gegenereerde seed-inserts.
- `src/content/mapContent.ts` — pure mapper van DB-rijen → `Content`-vorm + indexen.
- `src/content/fetchContent.ts` — Supabase-queries die alle content ophalen.
- `src/content/ContentProvider.tsx` — React context + `useContent()` hook.
- `src/content/mapContent.test.ts` — unit-tests voor de mapper.
- `src/lib/score.test.ts` — unit-tests voor scoring (refactored).
- `src/lib/admin-api.ts` — admin-RPC-wrappers.
- `src/lib/admin-identity.ts` — admin-secret in localStorage.
- `src/lib/test-api.ts` — wrappers voor simuleer-RPC's.
- `src/lib/warmupLocal.ts` — lokale warm-up-score/voortgang (localStorage).
- `src/pages/Warmup.tsx` — sessie-loze oefenpagina.
- `src/pages/Admin.tsx` — CMS-pagina.
- `src/components/admin/AdminGate.tsx` — sleutel-invoer + verificatie.
- `src/components/admin/EntityForm.tsx` — data-gedreven formulier-engine (één component).
- `src/components/admin/schemas.ts` — veld-schema's per entiteit (questions/stops/cards/activities/settings).
- `vitest.config.ts` — testconfig.

**Gewijzigd:**
- `src/content/content.ts` — wordt dun: behoudt alleen `QuestionLocation`-type + re-export; helpers verhuizen naar de provider/mapper.
- `src/main.tsx` — wrap in `ContentProvider`; routes `/warmup` en `/admin`.
- `src/lib/score.ts` — `rankParticipants`/`timelineWinners` krijgen `timelineQuestionIds` als argument.
- `src/lib/api.ts` — `hostRevealMc` zonder `correctIndex`/`points`; `submitWarmupAnswer` verwijderd.
- `src/pages/Landing.tsx`, `Join.tsx`, `Play.tsx`, `Master.tsx` — `useContent()`.
- `src/components/WarmupView.tsx`, `LiveViews.tsx`, `FinishView.tsx`, `host.tsx`, `Leaderboard.tsx`, `StopHeader.tsx` — content via `useContent()`/props.

---

## FASE 0 — Test-tooling

### Task 0.1: Vitest installeren en configureren

**Files:**
- Modify: `package.json` (scripts + devDeps)
- Create: `vitest.config.ts`

- [ ] **Step 1: Installeer Vitest**

Run:
```bash
npm install -D vitest@^3
```
Expected: `added N packages`, geen errors.

- [ ] **Step 2: Maak `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Voeg testscript toe aan `package.json`**

In `"scripts"` toevoegen (na `"preview"`):
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verifieer dat de runner draait (nog geen tests)**

Run: `npm test`
Expected: Vitest start en meldt "No test files found" of "no tests" — geen crash.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for logic unit tests"
```

---

## FASE 1 — DB-foundation: seed-generator + content-tabellen

### Task 1.1: Seed-SQL-generator

Genereert idempotente INSERTs uit `content_seed.json`, met correcte apostrof-escaping. Output gaat in `0002_cms.sql` (handmatig geplakt na review, of via `>>`).

**Files:**
- Create: `scripts/generate-seed-sql.mjs`

- [ ] **Step 1: Schrijf het generatorscript**

```js
// Genereert SQL-INSERTs voor de content-tabellen uit content_seed.json.
// Gebruik: node scripts/generate-seed-sql.mjs > /tmp/seed.sql
import { readFileSync } from 'node:fs'

const seed = JSON.parse(readFileSync(new URL('../content_seed.json', import.meta.url), 'utf8'))

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const b = (v) => (v ? 'true' : 'false')
const n = (v) => (v === null || v === undefined ? 'null' : Number(v))
const jsonb = (v) => (v === null || v === undefined ? 'null' : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`)

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
```

- [ ] **Step 2: Draai het script en bewaar de output**

Run: `node scripts/generate-seed-sql.mjs > /tmp/seed.sql && wc -l /tmp/seed.sql && head -3 /tmp/seed.sql`
Expected: ± 40+ regels; eerste regel begint met `insert into app_settings`. Geen `undefined` in de output.

- [ ] **Step 3: Commit het script**

```bash
git add scripts/generate-seed-sql.mjs
git commit -m "feat: seed-SQL generator from content_seed.json"
```

### Task 1.2: Migratie `0002_cms.sql` — tabellen + RLS + seed

**Files:**
- Create: `supabase/migrations/0002_cms.sql`

- [ ] **Step 1: Schrijf het tabellen- en RLS-deel**

```sql
-- =============================================================================
-- The Arrivals — 0002: content-CMS.
-- Content (stops, vragen, kaartjes, activiteiten, meta) verhuist naar de DB.
-- Publiek lezen; schrijven alleen via admin-RPC's (admin_secret).
-- Idempotent: veilig om opnieuw te draaien.
-- =============================================================================

create table if not exists app_settings (
  id int primary key default 1,
  title text not null,
  subtitle text,
  language text default 'nl',
  date text,
  central_question text,
  opening_line text,
  closing_line text,
  warmup_intro text,
  mc_points int not null default 1,
  open_points int not null default 2,
  timeline_note text,
  constraint app_settings_singleton check (id = 1)
);

create table if not exists stops (
  id text primary key,
  number int not null,
  name text not null,
  optional boolean not null default false,
  location text,
  era text,
  layer text,
  food text,
  intro text,
  reveal text,
  background text,
  sort_order int not null default 0
);

create table if not exists background_cards (
  id text primary key,
  title text not null,
  body text not null,
  sort_order int not null default 0
);

create table if not exists questions (
  id text primary key,
  group_id text not null,              -- 'warmup' of een stop-id
  type text not null,                  -- 'mc' | 'open'
  prompt text not null,
  options jsonb,                       -- array van strings (mc), anders null
  correct_index int,                   -- mc, anders null
  model_answer text,                   -- open, anders null
  points int not null default 1,
  is_timeline boolean not null default false,
  discussion boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true
);
create index if not exists questions_group_idx on questions (group_id, sort_order);

create table if not exists activities (
  id text primary key,
  stop_id text not null,
  title text not null,
  body text not null,
  sort_order int not null default 0
);

create table if not exists admin_config (
  id int primary key default 1,
  admin_secret text not null,
  constraint admin_config_singleton check (id = 1)
);

-- Admin-secret: willekeurig, eenmalig. Opzoeken via:
--   select admin_secret from admin_config;
insert into admin_config (id, admin_secret)
values (1, replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

-- RLS: publiek lezen op content; admin_config NIET leesbaar voor anon.
alter table app_settings enable row level security;
alter table stops enable row level security;
alter table background_cards enable row level security;
alter table questions enable row level security;
alter table activities enable row level security;
alter table admin_config enable row level security;

drop policy if exists "read settings" on app_settings;
drop policy if exists "read stops" on stops;
drop policy if exists "read cards" on background_cards;
drop policy if exists "read questions" on questions;
drop policy if exists "read activities" on activities;
create policy "read settings" on app_settings for select using (true);
create policy "read stops" on stops for select using (true);
create policy "read cards" on background_cards for select using (true);
create policy "read questions" on questions for select using (true);
create policy "read activities" on activities for select using (true);
-- admin_config: geen select-policy → anon kan niets lezen.

grant select on app_settings, stops, background_cards, questions, activities
  to anon, authenticated;
```

- [ ] **Step 2: Voeg de admin-autorisatiehelper + admin-RPC's toe**

Onderaan `0002_cms.sql`:
```sql
-- Admin-autorisatie
create or replace function assert_admin(p_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_config where admin_secret = p_secret) then
    raise exception 'unauthorized: ongeldig admin_secret';
  end if;
end;
$$;

create or replace function admin_check(p_secret text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  return exists (select 1 from admin_config where admin_secret = p_secret);
end;
$$;

create or replace function admin_upsert_question(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  insert into questions (id, group_id, type, prompt, options, correct_index,
    model_answer, points, is_timeline, discussion, sort_order, active)
  values (
    coalesce(nullif(p_row->>'id',''), 'q-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    p_row->>'group_id', p_row->>'type', p_row->>'prompt',
    case when p_row->'options' = 'null'::jsonb then null else p_row->'options' end,
    nullif(p_row->>'correct_index','')::int, nullif(p_row->>'model_answer',''),
    coalesce(nullif(p_row->>'points','')::int, 1),
    coalesce((p_row->>'is_timeline')::boolean, false),
    coalesce((p_row->>'discussion')::boolean, false),
    coalesce(nullif(p_row->>'sort_order','')::int, 0),
    coalesce((p_row->>'active')::boolean, true)
  )
  on conflict (id) do update set
    group_id = excluded.group_id, type = excluded.type, prompt = excluded.prompt,
    options = excluded.options, correct_index = excluded.correct_index,
    model_answer = excluded.model_answer, points = excluded.points,
    is_timeline = excluded.is_timeline, discussion = excluded.discussion,
    sort_order = excluded.sort_order, active = excluded.active;
end;
$$;

create or replace function admin_delete_question(p_secret text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  delete from questions where id = p_id;
end;
$$;

create or replace function admin_upsert_stop(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order)
  values (p_row->>'id', coalesce(nullif(p_row->>'number','')::int,0), p_row->>'name',
    coalesce((p_row->>'optional')::boolean,false), p_row->>'location', p_row->>'era',
    p_row->>'layer', nullif(p_row->>'food',''), p_row->>'intro', p_row->>'reveal',
    p_row->>'background', coalesce(nullif(p_row->>'sort_order','')::int,0))
  on conflict (id) do update set
    number=excluded.number, name=excluded.name, optional=excluded.optional,
    location=excluded.location, era=excluded.era, layer=excluded.layer, food=excluded.food,
    intro=excluded.intro, reveal=excluded.reveal, background=excluded.background,
    sort_order=excluded.sort_order;
end;
$$;

create or replace function admin_delete_stop(p_secret text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  delete from stops where id = p_id;
end;
$$;

create or replace function admin_upsert_card(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  insert into background_cards (id, title, body, sort_order)
  values (coalesce(nullif(p_row->>'id',''),'wu-bg-'||substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    p_row->>'title', p_row->>'body', coalesce(nullif(p_row->>'sort_order','')::int,0))
  on conflict (id) do update set title=excluded.title, body=excluded.body, sort_order=excluded.sort_order;
end;
$$;

create or replace function admin_delete_card(p_secret text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin perform assert_admin(p_secret); delete from background_cards where id = p_id; end;
$$;

create or replace function admin_upsert_activity(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  insert into activities (id, stop_id, title, body, sort_order)
  values (coalesce(nullif(p_row->>'id',''),'act-'||substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    p_row->>'stop_id', p_row->>'title', p_row->>'body', coalesce(nullif(p_row->>'sort_order','')::int,0))
  on conflict (id) do update set stop_id=excluded.stop_id, title=excluded.title, body=excluded.body, sort_order=excluded.sort_order;
end;
$$;

create or replace function admin_delete_activity(p_secret text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin perform assert_admin(p_secret); delete from activities where id = p_id; end;
$$;

create or replace function admin_update_settings(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  update app_settings set
    title=coalesce(p_row->>'title',title), subtitle=p_row->>'subtitle',
    date=p_row->>'date', central_question=p_row->>'central_question',
    opening_line=p_row->>'opening_line', closing_line=p_row->>'closing_line',
    warmup_intro=p_row->>'warmup_intro',
    mc_points=coalesce(nullif(p_row->>'mc_points','')::int,mc_points),
    open_points=coalesce(nullif(p_row->>'open_points','')::int,open_points),
    timeline_note=p_row->>'timeline_note'
  where id=1;
end;
$$;

grant execute on function
  admin_check(text), admin_upsert_question(text, jsonb), admin_delete_question(text, text),
  admin_upsert_stop(text, jsonb), admin_delete_stop(text, text),
  admin_upsert_card(text, jsonb), admin_delete_card(text, text),
  admin_upsert_activity(text, jsonb), admin_delete_activity(text, text),
  admin_update_settings(text, jsonb)
to anon, authenticated;
revoke execute on function assert_admin(text) from anon, authenticated;
```

- [ ] **Step 3: Herdefinieer scoring-RPC's (lezen uit DB) + drop warmup-write**

Onderaan `0002_cms.sql` (deze redefinities vervangen die uit `0001`). **Belangrijk:** de signaturen wijzigen (minder argumenten), dus eerst de oude droppen — anders maakt Postgres een overload i.p.v. te vervangen, wat PostgREST-ambiguïteit geeft:
```sql
-- Oude signaturen droppen (argumentenlijst wijzigt).
drop function if exists host_reveal_mc(uuid, text, text, int, int);
drop function if exists host_judge_open(uuid, text, boolean, int);

-- mc onthullen: lees correct_index + points uit de questions-tabel (niet client).
create or replace function host_reveal_mc(p_session_id uuid, p_host_secret text, p_question_id text)
returns void language plpgsql security definer set search_path = public as $$
declare r record; v_correct int; v_points int; v_new_status text; v_new_points int;
begin
  perform assert_host(p_session_id, p_host_secret);
  select correct_index, points into v_correct, v_points from questions where id = p_question_id;
  if v_correct is null then raise exception 'question_not_mc_or_missing'; end if;
  for r in select * from answers where session_id = p_session_id and question_id = p_question_id loop
    if r.response = v_correct::text then v_new_status:='correct'; v_new_points:=v_points;
    else v_new_status:='incorrect'; v_new_points:=0; end if;
    update answers set status=v_new_status, awarded_points=v_new_points where id=r.id;
    update participants set score = score - r.awarded_points + v_new_points where id=r.participant_id;
  end loop;
  update sessions set active_status='revealed' where id=p_session_id;
end;
$$;

-- open beoordelen: lees points uit de questions-tabel.
create or replace function host_judge_open(p_answer_id uuid, p_host_secret text, p_correct boolean)
returns void language plpgsql security definer set search_path = public as $$
declare a record; v_points int; v_new_status text; v_new_points int;
begin
  select * into a from answers where id = p_answer_id;
  if a is null then raise exception 'no_answer'; end if;
  perform assert_host(a.session_id, p_host_secret);
  select points into v_points from questions where id = a.question_id;
  if p_correct then v_new_status:='correct'; v_new_points:=coalesce(v_points,0);
  else v_new_status:='incorrect'; v_new_points:=0; end if;
  update answers set status=v_new_status, awarded_points=v_new_points where id=a.id;
  update participants set score = score - a.awarded_points + v_new_points where id=a.participant_id;
end;
$$;

grant execute on function host_reveal_mc(uuid, text, text), host_judge_open(uuid, text, boolean)
  to anon, authenticated;

-- Warm-up schrijft niets meer naar de DB (puur lokaal oefenen).
drop function if exists submit_warmup_answer(uuid, uuid, text, text, boolean, int);
```

- [ ] **Step 4: Voeg de gegenereerde seed onderaan toe**

Run: `node scripts/generate-seed-sql.mjs >> supabase/migrations/0002_cms.sql`
Daarna in het bestand een sectiekop `-- ---- SEED (gegenereerd) ----` boven de geplakte regels zetten.

- [ ] **Step 5: Statisch controleren (geen losse apostrof-fouten)**

Run: `grep -n "undefined" supabase/migrations/0002_cms.sql || echo "geen undefined — goed"`
Expected: `geen undefined — goed`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_cms.sql
git commit -m "feat: 0002 content CMS schema, admin RPCs, DB-based scoring, seed"
```

- [ ] **Step 7: HANDMATIG — draai de migratie in Supabase**

In de Supabase SQL Editor: plak de inhoud van `supabase/migrations/0002_cms.sql` → Run.
Daarna verifieer:
```sql
select count(*) from questions;   -- verwacht: 12 (5 warm-up + 7 stop-vragen)
select count(*) from stops;       -- verwacht: 10
select admin_secret from admin_config;  -- noteer deze sleutel
```
Noteer het `admin_secret` — dat heb je nodig voor `/admin`.

---

## FASE 2 — Content uit de DB: mapper + provider + refactor

### Task 2.1: DB→Content mapper (TDD)

**Files:**
- Create: `src/content/mapContent.ts`
- Create: `src/content/mapContent.test.ts`
- Modify: `src/content/types.ts` (DB-rij-types toevoegen)

- [ ] **Step 1: Voeg DB-rij-types toe aan `src/content/types.ts`**

Onderaan toevoegen:
```ts
// --- DB-rijen (zie supabase/migrations/0002_cms.sql) ---
export interface SettingsRow {
  title: string; subtitle: string | null; language: string | null; date: string | null
  central_question: string | null; opening_line: string | null; closing_line: string | null
  warmup_intro: string | null; mc_points: number; open_points: number; timeline_note: string | null
}
export interface StopRow {
  id: string; number: number; name: string; optional: boolean; location: string | null
  era: string | null; layer: string | null; food: string | null; intro: string | null
  reveal: string | null; background: string | null; sort_order: number
}
export interface CardRow { id: string; title: string; body: string; sort_order: number }
export interface QuestionRow {
  id: string; group_id: string; type: 'mc' | 'open'; prompt: string; options: string[] | null
  correct_index: number | null; model_answer: string | null; points: number
  is_timeline: boolean; discussion: boolean; sort_order: number; active: boolean
}
export interface ActivityRow { id: string; stop_id: string; title: string; body: string; sort_order: number }

export interface ContentRows {
  settings: SettingsRow; stops: StopRow[]; cards: CardRow[]
  questions: QuestionRow[]; activities: ActivityRow[]
}
```

- [ ] **Step 2: Schrijf de falende test**

```ts
// src/content/mapContent.test.ts
import { describe, it, expect } from 'vitest'
import { mapContent } from './mapContent'
import type { ContentRows } from './types'

const rows: ContentRows = {
  settings: {
    title: 'T', subtitle: 'S', language: 'nl', date: '2026-06-21', central_question: 'C',
    opening_line: 'O', closing_line: 'CL', warmup_intro: 'WI', mc_points: 1, open_points: 2, timeline_note: 'N',
  },
  stops: [
    { id: 's1', number: 1, name: 'Stop 1', optional: false, location: 'L', era: '1910s', layer: '1', food: null, intro: 'i', reveal: 'r', background: 'b', sort_order: 0 },
    { id: 's0', number: 0, name: 'Stop 0', optional: true, location: 'L', era: 'nu', layer: '0', food: 'Croissant', intro: 'i', reveal: 'r', background: 'b', sort_order: 1 },
  ],
  cards: [{ id: 'c1', title: 'Card', body: 'Body', sort_order: 0 }],
  questions: [
    { id: 'wu-q1', group_id: 'warmup', type: 'mc', prompt: 'P', options: ['a', 'b'], correct_index: 0, model_answer: null, points: 1, is_timeline: false, discussion: false, sort_order: 0, active: true },
    { id: 's1-q1', group_id: 's1', type: 'open', prompt: 'P2', options: null, correct_index: null, model_answer: 'M', points: 2, is_timeline: true, discussion: false, sort_order: 0, active: true },
    { id: 's1-q2', group_id: 's1', type: 'mc', prompt: 'inactief', options: ['x'], correct_index: 0, model_answer: null, points: 1, is_timeline: false, discussion: false, sort_order: 1, active: false },
  ],
  activities: [{ id: 'a1', stop_id: 's1', title: 'Act', body: 'AB', sort_order: 0 }],
}

describe('mapContent', () => {
  const c = mapContent(rows)
  it('stops gesorteerd op sort_order', () => {
    expect(c.stops.map((s) => s.id)).toEqual(['s1', 's0'])
  })
  it('warm-up vragen onder warmup', () => {
    expect(c.warmup.questions.map((q) => q.id)).toEqual(['wu-q1'])
    expect(c.warmup.intro).toBe('WI')
  })
  it('inactieve vragen worden weggelaten', () => {
    expect(c.stops[0].questions.map((q) => q.id)).toEqual(['s1-q1'])
  })
  it('activiteiten bij de juiste stop', () => {
    expect(c.stops[0].activities?.[0].id).toBe('a1')
  })
  it('timelineQuestionIds afgeleid', () => {
    expect(c.timelineQuestionIds).toEqual(['s1-q1'])
  })
  it('findQuestion en findActivity', () => {
    expect(c.findQuestion('s1-q1')?.stop?.id).toBe('s1')
    expect(c.findActivity('a1')?.stop.id).toBe('s1')
    expect(c.isActivityId('a1')).toBe(true)
    expect(c.isActivityId('s1-q1')).toBe(false)
  })
})
```

- [ ] **Step 3: Run de test (faalt)**

Run: `npx vitest run src/content/mapContent.test.ts`
Expected: FAIL — `mapContent` bestaat niet.

- [ ] **Step 4: Implementeer `mapContent`**

```ts
// src/content/mapContent.ts
import type {
  Activity, Content, ContentRows, Meta, Question, Stop, Warmup,
} from './types'

export interface QuestionLocation {
  question: Question; stop?: Stop; groupId: string; groupLabel: string
}

export interface MappedContent extends Content {
  stopsWithQuestions: Stop[]
  findQuestion(id: string | null | undefined): QuestionLocation | undefined
  findActivity(id: string | null | undefined): { activity: Activity; stop: Stop } | undefined
  isActivityId(id: string | null | undefined): boolean
  isTimelineQuestion(id: string): boolean
}

export function mapContent(rows: ContentRows): MappedContent {
  const s = rows.settings
  const meta: Meta = {
    title: s.title, subtitle: s.subtitle ?? '', language: s.language ?? 'nl', date: s.date ?? '',
    centralQuestion: s.central_question ?? '', openingLine: s.opening_line ?? '', closingLine: s.closing_line ?? '',
    scoring: { mcPoints: s.mc_points, openPoints: s.open_points, timelineNote: s.timeline_note ?? '' },
  }

  const activeQuestions = rows.questions.filter((q) => q.active)
  const byGroup = (gid: string): Question[] =>
    activeQuestions
      .filter((q) => q.group_id === gid)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toQuestion)

  const warmup: Warmup = {
    intro: s.warmup_intro ?? '',
    backgroundCards: [...rows.cards].sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ id: c.id, title: c.title, body: c.body })),
    questions: byGroup('warmup'),
  }

  const stops: Stop[] = [...rows.stops]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((st) => ({
      id: st.id, number: st.number, name: st.name, optional: st.optional,
      location: st.location ?? '', era: st.era ?? '', layer: st.layer ?? '',
      food: st.food ?? undefined, intro: st.intro ?? '', reveal: st.reveal ?? '',
      background: st.background ?? '',
      activities: rows.activities.filter((a) => a.stop_id === st.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((a) => ({ id: a.id, title: a.title, body: a.body })),
      questions: byGroup(st.id),
    }))

  const timelineQuestionIds = activeQuestions.filter((q) => q.is_timeline).map((q) => q.id)

  const questionIndex = new Map<string, QuestionLocation>()
  for (const q of warmup.questions) questionIndex.set(q.id, { question: q, groupId: 'warmup', groupLabel: 'Warm-up' })
  for (const stop of stops)
    for (const q of stop.questions)
      questionIndex.set(q.id, { question: q, stop, groupId: stop.id, groupLabel: `Stop ${stop.number} · ${stop.name}` })

  const activityIndex = new Map<string, { activity: Activity; stop: Stop }>()
  for (const stop of stops) for (const a of stop.activities ?? []) activityIndex.set(a.id, { activity: a, stop })

  return {
    meta, warmup, stops, timelineQuestionIds,
    stopsWithQuestions: stops.filter((s) => s.questions.length > 0),
    findQuestion: (id) => (id ? questionIndex.get(id) : undefined),
    findActivity: (id) => (id ? activityIndex.get(id) : undefined),
    isActivityId: (id) => !!id && activityIndex.has(id),
    isTimelineQuestion: (id) => timelineQuestionIds.includes(id),
  }
}

function toQuestion(q: ContentRows['questions'][number]): Question {
  return {
    id: q.id, type: q.type, prompt: q.prompt, options: q.options ?? undefined,
    correctIndex: q.correct_index ?? undefined, modelAnswer: q.model_answer ?? undefined,
    points: q.points, isTimeline: q.is_timeline, discussion: q.discussion,
  }
}
```

- [ ] **Step 5: Run de test (slaagt)**

Run: `npx vitest run src/content/mapContent.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/content/mapContent.ts src/content/mapContent.test.ts src/content/types.ts
git commit -m "feat: DB-rows to Content mapper with tests"
```

### Task 2.2: Content ophalen uit Supabase

**Files:**
- Create: `src/content/fetchContent.ts`

- [ ] **Step 1: Schrijf de fetch-functie**

```ts
// src/content/fetchContent.ts
import { supabase } from '../lib/supabase'
import type { ContentRows } from './types'

export async function fetchContentRows(): Promise<ContentRows> {
  const [settings, stops, cards, questions, activities] = await Promise.all([
    supabase.from('app_settings').select('*').eq('id', 1).single(),
    supabase.from('stops').select('*'),
    supabase.from('background_cards').select('*'),
    supabase.from('questions').select('*'),
    supabase.from('activities').select('*'),
  ])
  for (const r of [settings, stops, cards, questions, activities]) {
    if (r.error) throw new Error(r.error.message)
  }
  return {
    settings: settings.data as ContentRows['settings'],
    stops: (stops.data ?? []) as ContentRows['stops'],
    cards: (cards.data ?? []) as ContentRows['cards'],
    questions: (questions.data ?? []) as ContentRows['questions'],
    activities: (activities.data ?? []) as ContentRows['activities'],
  }
}
```

- [ ] **Step 2: Build-check (types kloppen)**

Run: `npx tsc -b`
Expected: geen errors.

- [ ] **Step 3: Commit**

```bash
git add src/content/fetchContent.ts
git commit -m "feat: fetch content rows from supabase"
```

### Task 2.3: ContentProvider + useContent

**Files:**
- Create: `src/content/ContentProvider.tsx`
- Modify: `src/content/content.ts` (afslanken)

- [ ] **Step 1: Schrijf de provider**

```tsx
// src/content/ContentProvider.tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchContentRows } from './fetchContent'
import { mapContent, type MappedContent } from './mapContent'

interface ContentState {
  content: MappedContent | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const Ctx = createContext<ContentState | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<MappedContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchContentRows()
      setContent(mapContent(rows))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon content niet laden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  return <Ctx.Provider value={{ content, loading, error, refetch }}>{children}</Ctx.Provider>
}

/** Geeft de geladen content. Gebruik binnen schermen die na de laadcheck renderen. */
export function useContent(): MappedContent {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useContent buiten ContentProvider')
  if (!ctx.content) throw new Error('content nog niet geladen — render achter useContentState().loading')
  return ctx.content
}

/** Voor laad-/foutafhandeling en refetch (bv. in /admin). */
export function useContentState(): ContentState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useContentState buiten ContentProvider')
  return ctx
}
```

- [ ] **Step 2: Slank `src/content/content.ts` af tot re-exports**

Vervang de hele inhoud door:
```ts
// Content komt nu uit de DB via ContentProvider/useContent.
// content_seed.json blijft als back-up/seed-bron in de repo (niet meer geïmporteerd).
export type { QuestionLocation, MappedContent } from './mapContent'
export { ContentProvider, useContent, useContentState } from './ContentProvider'
```

- [ ] **Step 3: Build-check**

Run: `npx tsc -b`
Expected: errors in bestanden die nog statische imports (`stops`, `warmup`, `findQuestion`, `meta`) gebruiken — dat is verwacht; die fix je in Task 2.4. Noteer de lijst.

- [ ] **Step 4: Commit**

```bash
git add src/content/ContentProvider.tsx src/content/content.ts
git commit -m "feat: ContentProvider + useContent hook"
```

### Task 2.4: App omschakelen naar useContent()

**Files:**
- Modify: `src/main.tsx`, `src/lib/score.ts`, `src/lib/api.ts`, `src/pages/Landing.tsx`, `src/pages/Join.tsx`, `src/pages/Play.tsx`, `src/pages/Master.tsx`, `src/components/WarmupView.tsx`, `src/components/LiveViews.tsx`, `src/components/FinishView.tsx`, `src/components/host.tsx`, `src/components/Leaderboard.tsx`, `src/components/StopHeader.tsx`

- [ ] **Step 1: `src/lib/score.ts` — `timelineQuestionIds` als argument**

Vervang de twee functiesignaturen zodat ze de ids meekrijgen i.p.v. te importeren. Verwijder de import `from '../content/content'`. Nieuwe signaturen:
```ts
export function rankParticipants(
  participants: ParticipantRow[], answers: AnswerRow[], timelineQuestionIds: string[],
): RankedParticipant[] { /* gebruik de parameter i.p.v. de import */ }

export function timelineWinners(
  participants: ParticipantRow[], answers: AnswerRow[], timelineQuestionIds: string[],
): { winners: RankedParticipant[]; topScore: number } {
  const ranked = rankParticipants(participants, answers, timelineQuestionIds)
  /* ... ongewijzigd ... */
}
```
Binnen `rankParticipants` vervang `timelineQuestionIds.includes(...)` (voorheen import) door de parameter (zelfde naam — werkt direct).

- [ ] **Step 2: `src/lib/api.ts` — scoring-RPC's aanpassen, warmup verwijderen**

- Verwijder de hele functie `submitWarmupAnswer`.
- Vervang `hostRevealMc` door (zonder correctIndex/points):
```ts
export async function hostRevealMc(args: { sessionId: string; secret: string; questionId: string }) {
  const { error } = await supabase.rpc('host_reveal_mc', {
    p_session_id: args.sessionId, p_host_secret: args.secret, p_question_id: args.questionId,
  })
  if (error) throw new Error(error.message)
}
```
- Vervang `hostJudgeOpen` door (zonder points):
```ts
export async function hostJudgeOpen(args: { answerId: string; secret: string; correct: boolean }) {
  const { error } = await supabase.rpc('host_judge_open', {
    p_answer_id: args.answerId, p_host_secret: args.secret, p_correct: args.correct,
  })
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 3: `src/main.tsx` — provider + routes**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { ContentProvider } from './content/content.ts'
import Landing from './pages/Landing.tsx'
import Join from './pages/Join.tsx'
import Play from './pages/Play.tsx'
import Master from './pages/Master.tsx'
import Warmup from './pages/Warmup.tsx'
import Admin from './pages/Admin.tsx'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/join', element: <Join /> },
  { path: '/play', element: <Play /> },
  { path: '/master', element: <Master /> },
  { path: '/warmup', element: <Warmup /> },
  { path: '/admin', element: <Admin /> },
  { path: '*', element: <Landing /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContentProvider>
      <RouterProvider router={router} />
    </ContentProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Pas elke consument aan naar `useContent()`**

In elk van deze bestanden: verwijder `import { ... } from '../content/content'` (waar het statische data betrof) en haal de data uit `const c = useContent()`:
- `Landing.tsx`: `const { meta } = useContent()`.
- `Join.tsx`: gebruikt geen content → alleen build-check.
- `Play.tsx`: `const c = useContent()`; gebruik `c.findActivity`, `c.findQuestion`, `c.meta`, `c.isActivityId`. Render eerst een laadcheck: bovenin `const { content, loading } = useContentState()` en toon "Laden…" tot `content` er is, daarna `useContent()`. Praktischer: gebruik alleen `useContentState()` en guard.
- `Master.tsx`: `const c = useContent()`; vervang `meta`, `stopsWithQuestions`, `warmup`, `stops`. `hostRevealMc`-aanroep: verwijder `correctIndex`/`points`-velden. `HostQuestionPicker`/`HostActivityPicker`/`host.tsx` krijgen content via props of `useContent()` direct.
- `components/host.tsx`: vervang imports `findActivity, findQuestion, isActivityId, isTimelineQuestion, stops, stopsWithQuestions, warmup` door `const c = useContent()` bovenin elke component die ze gebruikt. `hostRevealMc({ sessionId, secret, questionId: q.id })` (zonder correctIndex/points). `isTimelineQuestion` → `c.isTimelineQuestion`.
- `components/LiveViews.tsx`: `isTimelineQuestion` → uit `useContent()`.
- `components/FinishView.tsx`: vervang `meta, stops` + module-level `slotStop` door `useContent()` binnen de component; `timelineWinners(participants, answers, c.timelineQuestionIds)`.
- `components/Leaderboard.tsx`: `rankParticipants(participants, answers, c.timelineQuestionIds)` met `const c = useContent()`.
- `components/StopHeader.tsx`: ontvangt `stop` al via props → geen wijziging behalve build-check.
- `components/WarmupView.tsx`: zie Task 4.x (wordt grotendeels herbruikt door /warmup); voor nu `useContent()` voor `warmup`/`stops`, en de scoringscalls vervangen door lokale logica (Task 4.2). Tijdelijk mag de in-sessie warmup de oefenlogica hergebruiken.

Belangrijk: voeg in `Play.tsx` en `Master.tsx` bovenaan de render een guard toe:
```tsx
const { content, loading, error } = useContentState()
if (loading && !content) return <Screen className="justify-center"><p className="text-center text-paper/50">Content laden…</p></Screen>
if (!content) return <Screen className="justify-center"><Notice tone="error">{error ?? 'Content kon niet laden.'}</Notice></Screen>
```
en gebruik daарna `const c = content` (de `MappedContent`).

- [ ] **Step 5: Build tot groen**

Run: `npx tsc -b`
Expected: geen errors. Los resterende verwijzingen naar oude statische exports op tot het bouwt.

- [ ] **Step 6: Volledige build + bestaande tests**

Run: `npm run build && npm test`
Expected: build slaagt; mapContent/score-tests groen.

- [ ] **Step 7: HANDMATIG smoke-test (DB-content)**

Zet de anon-key in `.env.local`, draai `npm run dev -- --port 5199 --strictPort`, open `/` en `/master`. Verwacht: landing toont titel uit DB; host kan een sessie aanmaken (geen `gen_random_bytes`-fout); de vragenlijst toont de stops uit de DB.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: load all content from DB via useContent()"
```

### Task 2.5: score.ts test bijwerken

**Files:**
- Create: `src/lib/score.test.ts`

- [ ] **Step 1: Schrijf de test met expliciete timeline-ids**

```ts
import { describe, it, expect } from 'vitest'
import { rankParticipants, timelineWinners } from './score'
import type { AnswerRow, ParticipantRow } from './db-types'

const p = (id: string, name: string, score: number, joined: string): ParticipantRow =>
  ({ id, session_id: 's', name, score, joined_at: joined })
const a = (pid: string, qid: string, pts: number): AnswerRow =>
  ({ id: pid + qid, session_id: 's', participant_id: pid, question_id: qid, response: '0', status: 'correct', awarded_points: pts, created_at: '' })

describe('score', () => {
  const parts = [p('a', 'Ann', 5, '1'), p('b', 'Bo', 5, '2'), p('c', 'Cy', 2, '3')]
  const answers = [a('a', 's1-q1', 2), a('b', 's8-q1', 1)]
  const tl = ['s1-q1', 's8-q1']
  it('rangschikt op score, dan timeline, dan joined', () => {
    const r = rankParticipants(parts, answers, tl)
    expect(r[0].id).toBe('a') // gelijke score, hogere timeline
    expect(r[0].rank).toBe(1)
    expect(r[1].rank).toBe(1) // gedeelde rang
  })
  it('timeline-winnaar', () => {
    const { winners, topScore } = timelineWinners(parts, answers, tl)
    expect(topScore).toBe(2)
    expect(winners.map((w) => w.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run (slaagt)**

Run: `npx vitest run src/lib/score.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/score.test.ts
git commit -m "test: score ranking with explicit timeline ids"
```

---

## FASE 3 — Sessie-loze /warmup (telt niet)

### Task 3.1: Lokale warm-up-logica (TDD)

**Files:**
- Create: `src/lib/warmupLocal.ts`
- Create: `src/lib/warmupLocal.test.ts`

- [ ] **Step 1: Falende test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadProgress, recordAnswer, clearProgress } from './warmupLocal'

beforeEach(() => clearProgress())

describe('warmupLocal', () => {
  it('slaat een mc-antwoord op met correctheid', () => {
    recordAnswer({ questionId: 'wu-q1', response: '0', correct: true, points: 1 })
    const p = loadProgress()
    expect(p['wu-q1']).toEqual({ response: '0', correct: true, points: 1 })
  })
  it('overschrijft niet bij tweede poging (oefenen = eenmalig vastgezet)', () => {
    recordAnswer({ questionId: 'wu-q1', response: '0', correct: true, points: 1 })
    recordAnswer({ questionId: 'wu-q1', response: '1', correct: false, points: 1 })
    expect(loadProgress()['wu-q1'].correct).toBe(true)
  })
})
```
Let op: gebruik in `vitest.config.ts` environment `node`; voeg voor deze test een localStorage-shim toe bovenin het testbestand:
```ts
// minimal localStorage shim voor node-omgeving
const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] }, clear: () => { for (const k in store) delete store[k] },
  key: () => null, length: 0,
} as Storage
```

- [ ] **Step 2: Run (faalt)**

Run: `npx vitest run src/lib/warmupLocal.test.ts`
Expected: FAIL — module bestaat niet.

- [ ] **Step 3: Implementeer**

```ts
// src/lib/warmupLocal.ts — lokale, niet-tellende warm-up-voortgang.
export interface LocalAnswer { response: string; correct: boolean; points: number }
export type WarmupProgress = Record<string, LocalAnswer>

const KEY = 'ta_warmup_progress'

export function loadProgress(): WarmupProgress {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as WarmupProgress } catch { return {} }
}
export function recordAnswer(a: LocalAnswer & { questionId: string }): WarmupProgress {
  const p = loadProgress()
  if (p[a.questionId]) return p // eenmaal vastgezet
  p[a.questionId] = { response: a.response, correct: a.correct, points: a.points }
  localStorage.setItem(KEY, JSON.stringify(p))
  return p
}
export function clearProgress() { localStorage.removeItem(KEY) }
```

- [ ] **Step 4: Run (slaagt)**

Run: `npx vitest run src/lib/warmupLocal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/warmupLocal.ts src/lib/warmupLocal.test.ts
git commit -m "feat: local (non-scoring) warm-up progress"
```

### Task 3.2: Refactor WarmupView naar lokale scoring + /warmup-pagina

**Files:**
- Modify: `src/components/WarmupView.tsx`
- Create: `src/pages/Warmup.tsx`

- [ ] **Step 1: Herschrijf `WarmupView` zodat het lokaal scoort en geen `me`/DB nodig heeft**

Nieuwe props: `{ }` (geen). Het gebruikt `useContent()` voor `warmup`/`stops` en `warmupLocal` voor antwoorden. Vervang elke `submitWarmupAnswer(...)`-aanroep door `recordAnswer({ questionId, response, correct, points })` en lees bestaande antwoorden uit `loadProgress()`. Verwijder de `ParticipantIdentity`-import en `answers`-prop. De mc-knoppen en open-tekstvelden gedragen zich hetzelfde, maar de "uitslag" komt uit `loadProgress()[q.id]`.

Concreet voor de `WarmupQuestion`-subcomponent:
```tsx
const existing = loadProgress()[q.id]
const [answer, setAnswer] = useState(existing)
function pick(index: number) {
  if (answer) return
  const correct = index === q.correctIndex
  recordAnswer({ questionId: q.id, response: String(index), correct, points: q.points })
  setAnswer({ response: String(index), correct, points: q.points })
}
function submitOpen() {
  if (answer || !text.trim()) return
  recordAnswer({ questionId: q.id, response: text.trim(), correct: true, points: q.points })
  setAnswer({ response: text.trim(), correct: true, points: q.points })
}
```
en de uitslag-render gebruikt `answer.correct` / `answer.points`.

- [ ] **Step 2: Maak `src/pages/Warmup.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useContentState } from '../content/content'
import { Screen, MultilingualGreeting, Notice, Button } from '../components/ui'
import { WarmupView } from '../components/WarmupView'

export default function Warmup() {
  const { content, loading, error } = useContentState()
  if (loading && !content) return <Screen className="justify-center"><p className="text-center text-paper/50">Warm-up laden…</p></Screen>
  if (!content) return <Screen className="justify-center"><Notice tone="error">{error ?? 'Kon de warm-up niet laden.'}</Notice></Screen>
  return (
    <Screen>
      <header className="mb-4">
        <MultilingualGreeting />
        <h1 className="font-display mt-2 text-2xl font-bold text-paper">Warm-up — thuis oefenen</h1>
        <p className="text-sm text-paper/60">Vrijblijvend; dit telt niet mee voor het klassement.</p>
      </header>
      <WarmupView />
      <div className="mt-8 flex flex-col items-center gap-2">
        <Link to="/join"><Button variant="secondary">Klaar om mee te doen? Join een sessie →</Button></Link>
        <Link to="/" className="text-xs text-paper/40 underline underline-offset-4">Terug</Link>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 3: Verwijder de in-sessie warm-up-scoring uit `Play.tsx`**

In `Play.tsx` (phase `warmup`) blijft `WarmupView` staan maar zonder props (`<WarmupView />`); deelnemers oefenen ook in de lobby, niet-tellend. Verwijder de `myAnswers`-doorgifte aan WarmupView.

- [ ] **Step 4: Landing-knop naar /warmup**

In `Landing.tsx` onder "Doe mee" een secundaire link toevoegen:
```tsx
<Link to="/warmup"><Button variant="secondary" block>Thuis oefenen (warm-up)</Button></Link>
```

- [ ] **Step 5: Build + tests**

Run: `npm run build && npm test`
Expected: groen.

- [ ] **Step 6: HANDMATIG smoke-test**

Open `/warmup` zonder sessie. Verwacht: kaartjes + vragen laden uit DB; mc geeft direct goed/fout; herladen behoudt antwoorden (localStorage); geen netwerk-schrijfacties (check Network-tab: geen POST naar `/rest`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: session-less /warmup practice page (local scoring)"
```

---

## FASE 4 — /admin CMS (geheime link)

### Task 4.1: Admin-identiteit + API

**Files:**
- Create: `src/lib/admin-identity.ts`
- Create: `src/lib/admin-api.ts`

- [ ] **Step 1: `admin-identity.ts`**

```ts
const KEY = 'ta_admin_secret'
export function saveAdminSecret(s: string) { localStorage.setItem(KEY, s) }
export function loadAdminSecret(): string | null { return localStorage.getItem(KEY) }
export function clearAdminSecret() { localStorage.removeItem(KEY) }
```

- [ ] **Step 2: `admin-api.ts`**

```ts
import { supabase } from './supabase'

async function rpc(fn: string, args: Record<string, unknown>) {
  const { error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
}

export async function adminCheck(secret: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_check', { p_secret: secret })
  if (error) throw new Error(error.message)
  return data === true
}

export const adminUpsertQuestion = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_question', { p_secret: secret, p_row: row })
export const adminDeleteQuestion = (secret: string, id: string) =>
  rpc('admin_delete_question', { p_secret: secret, p_id: id })
export const adminUpsertStop = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_stop', { p_secret: secret, p_row: row })
export const adminDeleteStop = (secret: string, id: string) =>
  rpc('admin_delete_stop', { p_secret: secret, p_id: id })
export const adminUpsertCard = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_card', { p_secret: secret, p_row: row })
export const adminDeleteCard = (secret: string, id: string) =>
  rpc('admin_delete_card', { p_secret: secret, p_id: id })
export const adminUpsertActivity = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_activity', { p_secret: secret, p_row: row })
export const adminDeleteActivity = (secret: string, id: string) =>
  rpc('admin_delete_activity', { p_secret: secret, p_id: id })
export const adminUpdateSettings = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_update_settings', { p_secret: secret, p_row: row })
```

- [ ] **Step 3: Build-check + commit**

Run: `npx tsc -b` (verwacht groen voor deze bestanden)
```bash
git add src/lib/admin-identity.ts src/lib/admin-api.ts
git commit -m "feat: admin identity + RPC client"
```

### Task 4.2: Data-gedreven formulier-engine + veldschema's

**Files:**
- Create: `src/components/admin/schemas.ts`
- Create: `src/components/admin/EntityForm.tsx`

- [ ] **Step 1: Veldschema's**

```ts
// src/components/admin/schemas.ts
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'options'
export interface Field {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: { value: string; label: string }[] // voor select
  help?: string
}

export const questionFields = (groupOptions: { value: string; label: string }[]): Field[] => [
  { key: 'id', label: 'ID (leeg = automatisch)', type: 'text', help: 'bv. s4-q4' },
  { key: 'group_id', label: 'Hoort bij', type: 'select', required: true, options: groupOptions },
  { key: 'type', label: 'Type', type: 'select', required: true, options: [
    { value: 'mc', label: 'Multiple choice' }, { value: 'open', label: 'Open (host beoordeelt)' }] },
  { key: 'prompt', label: 'Vraag', type: 'textarea', required: true },
  { key: 'options', label: 'Opties (mc)', type: 'options' },
  { key: 'correct_index', label: 'Index juiste optie (mc, 0-gebaseerd)', type: 'number' },
  { key: 'model_answer', label: 'Modelantwoord / rubric (open)', type: 'textarea' },
  { key: 'points', label: 'Punten', type: 'number', required: true },
  { key: 'is_timeline', label: '🕰️ Telt mee voor Tijdlijn-kern', type: 'boolean' },
  { key: 'discussion', label: 'Discussie (niet scoren)', type: 'boolean' },
  { key: 'sort_order', label: 'Volgorde', type: 'number' },
  { key: 'active', label: 'Actief (zichtbaar)', type: 'boolean' },
]

export const stopFields: Field[] = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'number', label: 'Nummer', type: 'number', required: true },
  { key: 'name', label: 'Naam', type: 'text', required: true },
  { key: 'optional', label: 'Optioneel', type: 'boolean' },
  { key: 'location', label: 'Locatie', type: 'text' },
  { key: 'era', label: 'Era', type: 'text' },
  { key: 'layer', label: 'Laag', type: 'text' },
  { key: 'food', label: 'Hapje', type: 'text' },
  { key: 'intro', label: 'Intro', type: 'textarea' },
  { key: 'reveal', label: 'Reveal (niet in warm-up)', type: 'textarea' },
  { key: 'background', label: 'Achtergrond', type: 'textarea' },
  { key: 'sort_order', label: 'Volgorde', type: 'number' },
]

export const cardFields: Field[] = [
  { key: 'id', label: 'ID (leeg = automatisch)', type: 'text' },
  { key: 'title', label: 'Titel', type: 'text', required: true },
  { key: 'body', label: 'Tekst', type: 'textarea', required: true },
  { key: 'sort_order', label: 'Volgorde', type: 'number' },
]

export const activityFields = (stopOptions: { value: string; label: string }[]): Field[] => [
  { key: 'id', label: 'ID (leeg = automatisch)', type: 'text' },
  { key: 'stop_id', label: 'Stop', type: 'select', required: true, options: stopOptions },
  { key: 'title', label: 'Titel', type: 'text', required: true },
  { key: 'body', label: 'Instructie', type: 'textarea', required: true },
  { key: 'sort_order', label: 'Volgorde', type: 'number' },
]

export const settingsFields: Field[] = [
  { key: 'title', label: 'Titel', type: 'text', required: true },
  { key: 'subtitle', label: 'Subtitel', type: 'text' },
  { key: 'date', label: 'Datum', type: 'text' },
  { key: 'central_question', label: 'Centrale vraag', type: 'textarea' },
  { key: 'opening_line', label: 'Openingszin', type: 'textarea' },
  { key: 'closing_line', label: 'Slotzin', type: 'textarea' },
  { key: 'warmup_intro', label: 'Warm-up intro', type: 'textarea' },
  { key: 'mc_points', label: 'Punten mc', type: 'number' },
  { key: 'open_points', label: 'Punten open', type: 'number' },
  { key: 'timeline_note', label: 'Tijdlijn-notitie', type: 'text' },
]
```

- [ ] **Step 2: `EntityForm` (één generieke editor)**

```tsx
// src/components/admin/EntityForm.tsx
import { useState } from 'react'
import type { Field } from './schemas'
import { Button, Card } from '../ui'

type Row = Record<string, unknown>

export function EntityForm({
  fields, initial, onSubmit, onCancel,
}: {
  fields: Field[]
  initial?: Row
  onSubmit: (row: Row) => Promise<void>
  onCancel?: () => void
}) {
  const [row, setRow] = useState<Row>(() => initial ?? {})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set(key: string, value: unknown) { setRow((r) => ({ ...r, [key]: value })) }

  async function submit() {
    for (const f of fields) {
      if (f.required && (row[f.key] === undefined || row[f.key] === '')) {
        setErr(`Veld "${f.label}" is verplicht`); return
      }
    }
    setBusy(true); setErr(null)
    try { await onSubmit(row) } catch (e) { setErr(e instanceof Error ? e.message : 'Opslaan mislukte') } finally { setBusy(false) }
  }

  return (
    <Card className="flex flex-col gap-3">
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink/70">{f.label}</span>
          {f.type === 'textarea' ? (
            <textarea value={String(row[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} rows={3}
              className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow" />
          ) : f.type === 'boolean' ? (
            <input type="checkbox" checked={Boolean(row[f.key])} onChange={(e) => set(f.key, e.target.checked)} className="h-5 w-5" />
          ) : f.type === 'number' ? (
            <input type="number" value={String(row[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow" />
          ) : f.type === 'select' ? (
            <select value={String(row[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)}
              className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow">
              <option value="">— kies —</option>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'options' ? (
            <OptionsEditor value={(row[f.key] as string[]) ?? []} onChange={(v) => set(f.key, v)} />
          ) : (
            <input type="text" value={String(row[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)}
              className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow" />
          )}
          {f.help && <span className="text-xs text-ink/40">{f.help}</span>}
        </label>
      ))}
      {err && <p className="text-sm text-rose-mark">{err}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy}>{busy ? 'Opslaan…' : 'Opslaan'}</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Annuleren</Button>}
      </div>
    </Card>
  )
}

function OptionsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {value.map((opt, i) => (
        <div key={i} className="flex gap-1.5">
          <input value={opt} onChange={(e) => { const c = [...value]; c[i] = e.target.value; onChange(c) }}
            className="flex-1 rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none" />
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="px-2 text-rose-mark">✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...value, ''])} className="self-start text-sm text-clay underline">+ optie</button>
    </div>
  )
}
```

- [ ] **Step 3: Build-check + commit**

Run: `npx tsc -b`
```bash
git add src/components/admin/schemas.ts src/components/admin/EntityForm.tsx
git commit -m "feat: data-driven admin form engine + field schemas"
```

### Task 4.3: AdminGate + Admin-pagina

**Files:**
- Create: `src/components/admin/AdminGate.tsx`
- Create: `src/pages/Admin.tsx`

- [ ] **Step 1: `AdminGate` — sleutel invoeren/valideren**

```tsx
// src/components/admin/AdminGate.tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminCheck } from '../../lib/admin-api'
import { loadAdminSecret, saveAdminSecret } from '../../lib/admin-identity'
import { Button, Card, Notice, Screen } from '../ui'

export function AdminGate({ children }: { children: (secret: string) => React.ReactNode }) {
  const [params] = useSearchParams()
  const [secret, setSecret] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const candidate = params.get('key') ?? loadAdminSecret()
    if (!candidate) { setChecking(false); return }
    adminCheck(candidate).then((ok) => {
      if (ok) { saveAdminSecret(candidate); setSecret(candidate) }
      setChecking(false)
    }).catch((e) => { setError(e instanceof Error ? e.message : 'Fout'); setChecking(false) })
  }, [params])

  async function tryKey() {
    setError(null)
    try {
      if (await adminCheck(input.trim())) { saveAdminSecret(input.trim()); setSecret(input.trim()) }
      else setError('Ongeldige sleutel')
    } catch (e) { setError(e instanceof Error ? e.message : 'Fout') }
  }

  if (checking) return <Screen className="justify-center"><p className="text-center text-paper/50">Controleren…</p></Screen>
  if (secret) return <>{children(secret)}</>
  return (
    <Screen className="justify-center">
      <Card className="flex flex-col gap-3">
        <h1 className="font-display text-xl font-bold">Admin</h1>
        <p className="text-sm text-ink/60">Voer de admin-sleutel in (of open /admin?key=...).</p>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="admin_secret"
          className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow" />
        {error && <Notice tone="error">{error}</Notice>}
        <Button onClick={tryKey}>Openen</Button>
      </Card>
    </Screen>
  )
}
```

- [ ] **Step 2: `Admin.tsx` — lijsten + EntityForm per entiteit**

```tsx
// src/pages/Admin.tsx
import { useState } from 'react'
import { useContentState } from '../content/content'
import { AdminGate } from '../components/admin/AdminGate'
import { EntityForm } from '../components/admin/EntityForm'
import {
  questionFields, stopFields, cardFields, activityFields, settingsFields,
} from '../components/admin/schemas'
import {
  adminUpsertQuestion, adminDeleteQuestion, adminUpsertStop, adminDeleteStop,
  adminUpsertCard, adminDeleteCard, adminUpsertActivity, adminDeleteActivity, adminUpdateSettings,
} from '../lib/admin-api'
import { Button, Card, Screen } from '../components/ui'

type Tab = 'questions' | 'stops' | 'cards' | 'activities' | 'settings'

export default function Admin() {
  return <AdminGate>{(secret) => <AdminConsole secret={secret} />}</AdminGate>
}

function AdminConsole({ secret }: { secret: string }) {
  const { content, refetch } = useContentState()
  const [tab, setTab] = useState<Tab>('questions')
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)

  if (!content) return <Screen className="justify-center"><p className="text-paper/50">Laden…</p></Screen>

  const groupOptions = [
    { value: 'warmup', label: 'Warm-up' },
    ...content.stops.map((s) => ({ value: s.id, label: `Stop ${s.number} · ${s.name}` })),
  ]
  const stopOptions = content.stops.map((s) => ({ value: s.id, label: `Stop ${s.number} · ${s.name}` }))

  async function save(fn: () => Promise<void>) { await fn(); await refetch(); setEditing(null) }

  const tabs: Tab[] = ['questions', 'stops', 'cards', 'activities', 'settings']

  return (
    <Screen>
      <h1 className="font-display mb-3 text-xl font-bold text-paper">Admin · content</h1>
      <div className="mb-4 flex flex-wrap gap-1 rounded-2xl bg-paper/10 p-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => { setTab(t); setEditing(null) }}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${tab === t ? 'bg-amber-glow text-ink' : 'text-paper/60'}`}>{t}</button>
        ))}
      </div>

      {/* QUESTIONS */}
      {tab === 'questions' && (
        <Section title="Vragen" onNew={() => setEditing({ group_id: 'warmup', type: 'mc', points: 1, active: true })}>
          {editing && (
            <EntityForm fields={questionFields(groupOptions)} initial={editing}
              onSubmit={(row) => save(() => adminUpsertQuestion(secret, row))} onCancel={() => setEditing(null)} />
          )}
          {[...content.warmup.questions.map((q) => ({ ...q, group_id: 'warmup' })),
            ...content.stops.flatMap((s) => s.questions.map((q) => ({ ...q, group_id: s.id })))].map((q) => (
            <RowItem key={q.id} title={q.prompt} subtitle={`${q.type} · ${q.points}p${q.isTimeline ? ' · 🕰️' : ''}`}
              onEdit={() => setEditing(dbQuestion(q))}
              onDelete={() => save(() => adminDeleteQuestion(secret, q.id))} />
          ))}
        </Section>
      )}

      {/* STOPS */}
      {tab === 'stops' && (
        <Section title="Stops" onNew={() => setEditing({ optional: false })}>
          {editing && <EntityForm fields={stopFields} initial={editing}
            onSubmit={(row) => save(() => adminUpsertStop(secret, row))} onCancel={() => setEditing(null)} />}
          {content.stops.map((s) => (
            <RowItem key={s.id} title={`${s.number} · ${s.name}`} subtitle={s.era}
              onEdit={() => setEditing(dbStop(s))} onDelete={() => save(() => adminDeleteStop(secret, s.id))} />
          ))}
        </Section>
      )}

      {/* CARDS */}
      {tab === 'cards' && (
        <Section title="Warm-up-kaartjes" onNew={() => setEditing({})}>
          {editing && <EntityForm fields={cardFields} initial={editing}
            onSubmit={(row) => save(() => adminUpsertCard(secret, row))} onCancel={() => setEditing(null)} />}
          {content.warmup.backgroundCards.map((c) => (
            <RowItem key={c.id} title={c.title} subtitle={c.body.slice(0, 60)}
              onEdit={() => setEditing({ ...c })} onDelete={() => save(() => adminDeleteCard(secret, c.id))} />
          ))}
        </Section>
      )}

      {/* ACTIVITIES */}
      {tab === 'activities' && (
        <Section title="Activiteiten" onNew={() => setEditing({})}>
          {editing && <EntityForm fields={activityFields(stopOptions)} initial={editing}
            onSubmit={(row) => save(() => adminUpsertActivity(secret, row))} onCancel={() => setEditing(null)} />}
          {content.stops.flatMap((s) => (s.activities ?? []).map((a) => ({ a, s }))).map(({ a, s }) => (
            <RowItem key={a.id} title={a.title} subtitle={`Stop ${s.number}`}
              onEdit={() => setEditing({ ...a, stop_id: s.id })} onDelete={() => save(() => adminDeleteActivity(secret, a.id))} />
          ))}
        </Section>
      )}

      {/* SETTINGS */}
      {tab === 'settings' && (
        <EntityForm fields={settingsFields} initial={dbSettings(content.meta, content.warmup.intro)}
          onSubmit={(row) => save(() => adminUpdateSettings(secret, row))} />
      )}
    </Screen>
  )
}

function Section({ title, onNew, children }: { title: string; onNew: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-paper">{title}</h2>
        <Button onClick={onNew} className="px-3 py-2 text-sm">+ Nieuw</Button>
      </div>
      {children}
    </div>
  )
}

function RowItem({ title, subtitle, onEdit, onDelete }: { title: string; subtitle?: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink/50">{subtitle}</p>}
      </div>
      <Button variant="secondary" onClick={onEdit} className="px-3 py-2 text-sm">Bewerk</Button>
      <button onClick={() => { if (confirm('Verwijderen?')) onDelete() }} className="px-2 text-rose-mark">✕</button>
    </Card>
  )
}

// Domein → DB-rij vormen voor het bewerkformulier
function dbQuestion(q: { id: string; group_id: string; type: string; prompt: string; options?: string[]; correctIndex?: number; modelAnswer?: string; points: number; isTimeline?: boolean; discussion?: boolean }) {
  return { id: q.id, group_id: q.group_id, type: q.type, prompt: q.prompt, options: q.options ?? [],
    correct_index: q.correctIndex ?? '', model_answer: q.modelAnswer ?? '', points: q.points,
    is_timeline: q.isTimeline ?? false, discussion: q.discussion ?? false, active: true }
}
function dbStop(s: { id: string; number: number; name: string; optional?: boolean; location: string; era: string; layer: string; food?: string; intro: string; reveal: string; background: string }) {
  return { ...s, optional: s.optional ?? false, food: s.food ?? '' }
}
function dbSettings(meta: { title: string; subtitle: string; date: string; centralQuestion: string; openingLine: string; closingLine: string; scoring: { mcPoints: number; openPoints: number; timelineNote: string } }, warmupIntro: string) {
  return { title: meta.title, subtitle: meta.subtitle, date: meta.date, central_question: meta.centralQuestion,
    opening_line: meta.openingLine, closing_line: meta.closingLine, warmup_intro: warmupIntro,
    mc_points: meta.scoring.mcPoints, open_points: meta.scoring.openPoints, timeline_note: meta.scoring.timelineNote }
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: groen.

- [ ] **Step 4: HANDMATIG test `/admin`**

Open `/admin?key=<admin_secret uit Task 1.2 Step 7>`. Voeg een warm-up-mc-vraag toe (2 opties, correct_index 0, 1 punt). Verwacht: na opslaan verschijnt 'ie in de lijst; open `/warmup` (na refetch/herladen) → de nieuwe vraag staat erbij. Verwijder 'm weer. Open `/admin` zonder `?key=` in incognito → geen toegang.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: /admin CMS for questions, stops, cards, activities, settings"
```

---

## FASE 5 — Testbaarheid: simuleer-deelnemers

### Task 5.1: Test-RPC's in de DB

**Files:**
- Modify: `supabase/migrations/0002_cms.sql` (toevoegen onderaan, vóór de seed)

- [ ] **Step 1: Voeg test-RPC's toe**

```sql
-- Test-hulp: nepdeelnemer toevoegen (host-beveiligd).
create or replace function add_test_participant(p_session_id uuid, p_host_secret text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_host(p_session_id, p_host_secret);
  insert into participants (session_id, name) values (p_session_id, p_name);
end;
$$;

-- Test-hulp: laat alle deelnemers zonder antwoord een geldig willekeurig antwoord insturen
-- op de actieve, open vraag (host-beveiligd).
create or replace function simulate_answers(p_session_id uuid, p_host_secret text, p_question_id text)
returns void language plpgsql security definer set search_path = public as $$
declare r record; v_type text; v_optcount int; v_resp text;
begin
  perform assert_host(p_session_id, p_host_secret);
  select type, coalesce(jsonb_array_length(options),0) into v_type, v_optcount
    from questions where id = p_question_id;
  for r in
    select p.id from participants p where p.session_id = p_session_id
      and not exists (select 1 from answers a where a.participant_id = p.id and a.question_id = p_question_id)
  loop
    if v_type = 'mc' and v_optcount > 0 then
      v_resp := floor(random() * v_optcount)::text;
    else
      v_resp := 'Testantwoord ' || substr(replace(gen_random_uuid()::text,'-',''),1,4);
    end if;
    insert into answers (session_id, participant_id, question_id, response, status, awarded_points)
    values (p_session_id, r.id, p_question_id, v_resp, 'pending', 0)
    on conflict (participant_id, question_id) do nothing;
  end loop;
end;
$$;

grant execute on function add_test_participant(uuid, text, text), simulate_answers(uuid, text, text)
  to anon, authenticated;
```

- [ ] **Step 2: Commit + HANDMATIG opnieuw draaien in Supabase**

```bash
git add supabase/migrations/0002_cms.sql
git commit -m "feat: test RPCs add_test_participant + simulate_answers"
```
Draai de twee nieuwe functie-blokken in de Supabase SQL Editor.

### Task 5.2: Simuleer-knoppen in de host-console

**Files:**
- Create: `src/lib/test-api.ts`
- Modify: `src/components/host.tsx` (een `HostTestTools`-component), `src/pages/Master.tsx`

- [ ] **Step 1: `test-api.ts`**

```ts
import { supabase } from './supabase'

export async function addTestParticipant(sessionId: string, secret: string, name: string) {
  const { error } = await supabase.rpc('add_test_participant', {
    p_session_id: sessionId, p_host_secret: secret, p_name: name })
  if (error) throw new Error(error.message)
}
export async function simulateAnswers(sessionId: string, secret: string, questionId: string) {
  const { error } = await supabase.rpc('simulate_answers', {
    p_session_id: sessionId, p_host_secret: secret, p_question_id: questionId })
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: `HostTestTools` in `host.tsx`**

```tsx
export function HostTestTools({ session, secret }: { session: PublicSession; secret: string }) {
  const names = ['Testpiet', 'Testanna', 'Testomar', 'Testlin']
  const [n, setN] = useState(0)
  return (
    <Card>
      <h3 className="font-display text-lg font-bold">Testgereedschap</h3>
      <p className="mt-1 text-sm text-ink/60">Voor solo-testen van de live-flow.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={async () => {
          await addTestParticipant(session.id, secret, names[n % names.length] + ' ' + (n + 1)); setN(n + 1)
        }}>+ Testdeelnemer</Button>
        <Button variant="secondary" disabled={session.active_status !== 'open' || !session.active_question_id}
          onClick={() => simulateAnswers(session.id, secret, session.active_question_id!)}>
          Simuleer antwoorden
        </Button>
      </div>
    </Card>
  )
}
```
(Imports bovenin `host.tsx`: `useState`, `addTestParticipant`, `simulateAnswers` uit `../lib/test-api`.)

- [ ] **Step 3: Toon `HostTestTools` in `Master.tsx`**

In de live-fase, na `HostLeaderboard`, toevoegen: `<HostTestTools session={session} secret={secret} />`. Importeer `HostTestTools`.

- [ ] **Step 4: Build + HANDMATIG**

Run: `npm run build`
Open `/master`, maak sessie, fase → wandeling, push een mc-vraag, klik "+ Testdeelnemer" 3×, dan "Simuleer antwoorden". Verwacht: tally vult zich; "Toon antwoord + score" kent punten toe; leaderboard updatet.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: host test tools (simulate participants + answers)"
```

---

## FASE 6 — Documentatie + eindverificatie

### Task 6.1: README bijwerken

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Werk de README bij**

Voeg/actualiseer secties:
- **Setup**: nu twee migraties (`0001` + `0002`); na `0002` het `admin_secret` opzoeken (`select admin_secret from admin_config;`).
- **Routes**: voeg `/warmup` (sessie-loos oefenen) en `/admin` (CMS via `?key=`) toe.
- **Content beheren**: via `/admin` (instant, geen redeploy); `content_seed.json` is nu back-up/seed-bron.
- **Lokaal end-to-end testen**: stappen met `/master` + "+ Testdeelnemer" + "Simuleer antwoorden", plus twee-tab/incognito-flow.
- **Security**: admin-acties via `admin_secret`; `admin_config` niet leesbaar voor anon; scoring leest uit de DB.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for CMS, /warmup, /admin, test flow"
```

### Task 6.2: Eindverificatie

- [ ] **Step 1: Volledige build + alle tests**

Run: `npm run build && npm test`
Expected: build groen; alle Vitest-tests groen.

- [ ] **Step 2: Handmatige acceptatie-checklist (uit de spec)**

Loop de acceptatiecriteria uit de spec af op de draaiende app (host kan sessie maken; `/warmup` werkt sessie-loos; content uit DB; `/admin` voegt vraag toe zonder redeploy; anon kan `admin_secret` niet lezen; mc-score uit DB; simuleer-knop test de flow; live-flow/leaderboard/slot intact).

- [ ] **Step 3: Push**

```bash
git push
```

---

## Zelfreview (door planschrijver)

- **Spec-dekking:** CMS-tabellen (Task 1.2), admin-RPC's (1.2), content-provider/refactor (2.1–2.4), DB-scoring (2.4 + 1.2 Step 3), `/warmup` sessie-loos & niet-tellend (3.1–3.2), `/admin` geheime link (4.1–4.3), testbaarheid (5.1–5.2), README/test-script (6.1), seed-generatie (1.1), `gen_random_bytes`-fix (al gedaan, in `0001`). Alle spec-secties gedekt.
- **Placeholders:** geen "TBD/later"; code staat in elke codestap.
- **Type-consistentie:** `MappedContent`/`useContent`/`useContentState` consistent gebruikt; `hostRevealMc({sessionId,secret,questionId})` en `hostJudgeOpen({answerId,secret,correct})` overal zonder punten/correctIndex; `rankParticipants/timelineWinners(...,timelineQuestionIds)` overal met derde argument; DB-kolomnamen consistent tussen migratie, mapper-rijtypes en admin-schema's.
- **Aandachtspunt voor uitvoerder:** Task 2.4 raakt veel bestanden tegelijk; bouw incrementeel en gebruik `npx tsc -b` als kompas tot groen.
