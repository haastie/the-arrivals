-- =============================================================================
-- The Arrivals — Jackson Heights quiz/tour-app
-- Supabase / Postgres schema + RLS + RPC-functies.
--
-- Draai dit één keer in de Supabase SQL Editor (of via `supabase db push`).
-- Idempotent: veilig om opnieuw te draaien.
--
-- Beveiliging is BEWUST LICHT (privé spel, kleine groep). Alle schrijfacties
-- lopen via SECURITY DEFINER-functies; host-acties verifiëren `host_secret`.
-- Direct schrijven op de tabellen is voor de anon-rol geblokkeerd (alleen SELECT
-- voor realtime). Zie README §Security.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabellen
-- ----------------------------------------------------------------------------
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,             -- bv. "JH2126"
  host_secret text not null,                  -- random token; alleen wie dit heeft mag besturen
  phase text not null default 'warmup',       -- 'warmup' | 'live' | 'finished'
  active_question_id text,                    -- bv. "s4-q1" (verwijst naar content_seed.json)
  active_status text not null default 'idle', -- 'idle' | 'open' | 'locked' | 'revealed' | 'activity'
  created_at timestamptz default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  score int not null default 0,
  joined_at timestamptz default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  question_id text not null,                  -- verwijst naar content_seed.json
  response text,                              -- optie-index (mc) of vrije tekst (open)
  status text not null default 'pending',     -- 'pending' | 'correct' | 'incorrect'
  awarded_points int not null default 0,
  created_at timestamptz default now(),
  unique (participant_id, question_id)        -- één inzending per vraag per persoon
);

create index if not exists answers_session_question_idx on answers (session_id, question_id);
create index if not exists participants_session_idx on participants (session_id);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security — alleen SELECT voor anon (realtime). Schrijven via RPC.
-- ----------------------------------------------------------------------------
alter table sessions enable row level security;
alter table participants enable row level security;
alter table answers enable row level security;

drop policy if exists "read sessions" on sessions;
drop policy if exists "read participants" on participants;
drop policy if exists "read answers" on answers;

create policy "read sessions" on sessions for select using (true);
create policy "read participants" on participants for select using (true);
create policy "read answers" on answers for select using (true);

-- Column-level: host_secret wordt NOOIT aan anon gegeven (ook niet in realtime-payloads).
-- De host krijgt het secret één keer terug van create_session() en bewaart het lokaal.
grant select (id, join_code, phase, active_question_id, active_status, created_at)
  on sessions to anon, authenticated;
grant select on participants, answers to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Helper: host-autorisatie
-- ----------------------------------------------------------------------------
create or replace function assert_host(p_session_id uuid, p_host_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from sessions
    where id = p_session_id and host_secret = p_host_secret
  ) then
    raise exception 'unauthorized: ongeldig host_secret';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Sessie aanmaken (host) + joinen (deelnemer)
-- ----------------------------------------------------------------------------
create or replace function create_session()
returns table (id uuid, join_code text, host_secret text)
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_secret text;
  v_id uuid;
begin
  -- Uniek 6-teken-code: 2 hoofdletters + 4 cijfers (bv. "JH2126").
  loop
    v_code :=
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from sessions s where s.join_code = v_code);
  end loop;

  v_secret := encode(gen_random_bytes(16), 'hex');

  insert into sessions (join_code, host_secret)
  values (v_code, v_secret)
  returning sessions.id into v_id;

  return query select v_id, v_code, v_secret;
end;
$$;

create or replace function join_session(p_join_code text, p_name text)
returns table (id uuid, session_id uuid, name text, score int)
language plpgsql security definer set search_path = public as $$
declare
  v_session uuid;
  v_name text := nullif(btrim(p_name), '');
begin
  if v_name is null then
    raise exception 'name_required';
  end if;

  select s.id into v_session from sessions s where s.join_code = upper(btrim(p_join_code));
  if v_session is null then
    raise exception 'invalid_code';
  end if;

  return query
  with ins as (
    insert into participants (session_id, name)
    values (v_session, v_name)
    returning participants.id, participants.session_id, participants.name, participants.score
  )
  select ins.id, ins.session_id, ins.name, ins.score from ins;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Antwoorden inzenden
-- ----------------------------------------------------------------------------

-- Warm-up: zelf-gestuurd en direct gescoord (client levert correctheid + punten).
create or replace function submit_warmup_answer(
  p_session_id uuid,
  p_participant_id uuid,
  p_question_id text,
  p_response text,
  p_correct boolean,
  p_points int
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old int := 0;
  v_status text;
  v_points int;
begin
  select awarded_points into v_old
  from answers where participant_id = p_participant_id and question_id = p_question_id;
  v_old := coalesce(v_old, 0);

  if p_correct then
    v_status := 'correct'; v_points := p_points;
  else
    v_status := 'incorrect'; v_points := 0;
  end if;

  insert into answers (session_id, participant_id, question_id, response, status, awarded_points)
  values (p_session_id, p_participant_id, p_question_id, p_response, v_status, v_points)
  on conflict (participant_id, question_id) do update
    set response = excluded.response,
        status = v_status,
        awarded_points = v_points;

  update participants set score = score - v_old + v_points where id = p_participant_id;
end;
$$;

-- Live: inzenden mag alleen op de actieve, geopende vraag. Nog niet gescoord.
create or replace function submit_live_answer(
  p_session_id uuid,
  p_participant_id uuid,
  p_question_id text,
  p_response text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from sessions
    where id = p_session_id
      and active_question_id = p_question_id
      and active_status = 'open'
  ) then
    raise exception 'not_open: deze vraag staat niet (meer) open';
  end if;

  insert into answers (session_id, participant_id, question_id, response, status, awarded_points)
  values (p_session_id, p_participant_id, p_question_id, p_response, 'pending', 0)
  on conflict (participant_id, question_id) do update
    set response = excluded.response, status = 'pending', awarded_points = 0;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Host-acties (allemaal beschermd door host_secret)
-- ----------------------------------------------------------------------------
create or replace function host_set_phase(p_session_id uuid, p_host_secret text, p_phase text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_host(p_session_id, p_host_secret);
  if p_phase not in ('warmup', 'live', 'finished') then
    raise exception 'bad_phase';
  end if;
  update sessions set phase = p_phase where id = p_session_id;
end;
$$;

create or replace function host_push_question(p_session_id uuid, p_host_secret text, p_question_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_host(p_session_id, p_host_secret);
  update sessions
    set active_question_id = p_question_id, active_status = 'open'
  where id = p_session_id;
end;
$$;

create or replace function host_set_status(p_session_id uuid, p_host_secret text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_host(p_session_id, p_host_secret);
  if p_status not in ('idle', 'open', 'locked', 'revealed', 'activity') then
    raise exception 'bad_status';
  end if;
  update sessions set active_status = p_status where id = p_session_id;
end;
$$;

create or replace function host_push_activity(p_session_id uuid, p_host_secret text, p_activity_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_host(p_session_id, p_host_secret);
  update sessions
    set active_question_id = p_activity_id, active_status = 'activity'
  where id = p_session_id;
end;
$$;

create or replace function host_clear_active(p_session_id uuid, p_host_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_host(p_session_id, p_host_secret);
  update sessions
    set active_question_id = null, active_status = 'idle'
  where id = p_session_id;
end;
$$;

-- MC onthullen + auto-score. Idempotent: herberekent het verschil per antwoord.
create or replace function host_reveal_mc(
  p_session_id uuid,
  p_host_secret text,
  p_question_id text,
  p_correct_index int,
  p_points int
)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_new_status text;
  v_new_points int;
begin
  perform assert_host(p_session_id, p_host_secret);

  for r in
    select * from answers where session_id = p_session_id and question_id = p_question_id
  loop
    if r.response = p_correct_index::text then
      v_new_status := 'correct'; v_new_points := p_points;
    else
      v_new_status := 'incorrect'; v_new_points := 0;
    end if;

    update answers set status = v_new_status, awarded_points = v_new_points where id = r.id;
    update participants
      set score = score - r.awarded_points + v_new_points
    where id = r.participant_id;
  end loop;

  update sessions set active_status = 'revealed' where id = p_session_id;
end;
$$;

-- Open vraag: host beoordeelt één inzending (✓/✗). Idempotent.
create or replace function host_judge_open(
  p_answer_id uuid,
  p_host_secret text,
  p_correct boolean,
  p_points int
)
returns void language plpgsql security definer set search_path = public as $$
declare
  a record;
  v_new_status text;
  v_new_points int;
begin
  select * into a from answers where id = p_answer_id;
  if a is null then raise exception 'no_answer'; end if;
  perform assert_host(a.session_id, p_host_secret);

  if p_correct then
    v_new_status := 'correct'; v_new_points := p_points;
  else
    v_new_status := 'incorrect'; v_new_points := 0;
  end if;

  update answers set status = v_new_status, awarded_points = v_new_points where id = a.id;
  update participants
    set score = score - a.awarded_points + v_new_points
  where id = a.participant_id;
end;
$$;

-- Handmatige puntcorrectie (+/-).
create or replace function host_adjust_points(
  p_session_id uuid,
  p_host_secret text,
  p_participant_id uuid,
  p_delta int
)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_host(p_session_id, p_host_secret);
  update participants
    set score = score + p_delta
  where id = p_participant_id and session_id = p_session_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Rechten op de RPC's
-- ----------------------------------------------------------------------------
grant execute on function
  create_session(),
  join_session(text, text),
  submit_warmup_answer(uuid, uuid, text, text, boolean, int),
  submit_live_answer(uuid, uuid, text, text),
  host_set_phase(uuid, text, text),
  host_push_question(uuid, text, text),
  host_set_status(uuid, text, text),
  host_push_activity(uuid, text, text),
  host_clear_active(uuid, text),
  host_reveal_mc(uuid, text, text, int, int),
  host_judge_open(uuid, text, boolean, int),
  host_adjust_points(uuid, text, uuid, int)
to anon, authenticated;

-- assert_host is intern; niet aan anon geven.
revoke execute on function assert_host(uuid, text) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. Realtime — voeg de tabellen toe aan de publicatie
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table participants;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'answers'
  ) then
    alter publication supabase_realtime add table answers;
  end if;
end
$$;
