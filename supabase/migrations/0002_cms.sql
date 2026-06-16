-- =============================================================================
-- The Arrivals — 0002: content-CMS.
-- Content (stops, vragen, kaartjes, activiteiten, meta) verhuist naar de DB.
-- Publiek lezen; schrijven alleen via admin-RPC's (admin_secret).
-- Idempotent: veilig om opnieuw te draaien.
--
-- Draai dit NA 0001_init.sql. Zoek daarna het admin_secret op:
--   select admin_secret from admin_config;
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Content-tabellen
-- ----------------------------------------------------------------------------
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

-- Admin-secret voor /admin?key=...  Wijzig later desgewenst via:
--   update admin_config set admin_secret = '<nieuw>' where id = 1;
insert into admin_config (id, admin_secret)
values (1, '82ffc097ed7b30bce97a66763490f75b')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. RLS — publiek lezen op content; admin_config NIET leesbaar voor anon.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. Admin-autorisatie
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. Admin-CRUD-RPC's (alle beveiligd door admin_secret)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 5. Scoring leest nu uit de DB (niet langer client-supplied).
--    Signaturen wijzigen → eerst de oude uit 0001 droppen (anders een overload).
-- ----------------------------------------------------------------------------
drop function if exists host_reveal_mc(uuid, text, text, int, int);
drop function if exists host_judge_open(uuid, text, boolean, int);

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

-- ----------------------------------------------------------------------------
-- 6. Testgereedschap (host-beveiligd) — solo de live-flow testen.
-- ----------------------------------------------------------------------------
create or replace function add_test_participant(p_session_id uuid, p_host_secret text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_host(p_session_id, p_host_secret);
  insert into participants (session_id, name) values (p_session_id, p_name);
end;
$$;

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

-- ----------------------------------------------------------------------------
-- 7. SEED (gegenereerd uit content_seed.json via scripts/generate-seed-sql.mjs)
-- ----------------------------------------------------------------------------
insert into app_settings (id, title, subtitle, language, date, central_question, opening_line, closing_line, warmup_intro, mc_points, open_points, timeline_note) values (1, 'The Arrivals — Jackson Heights', 'Een quiz-wandeling door honderd jaar migratie', 'nl', '2026-06-21', 'Werkt het experiment van Jackson Heights? Houdt deze plek zijn belofte?', 'We lopen vandaag door de tijd. Elk blok is een ander decennium. Elke winkelpui is iemands antwoord op dezelfde vraag: houdt deze plek zijn belofte?', 'Je hebt de wereld doorkruist zonder te vliegen. Wat zegt dat over de wereld? En wat zegt het over deze stad?', 'Welkom. Voor we zondag de straat op gaan, een korte opwarmer. Lees de kaartjes, raad mee, en kom alvast in de stemming. Dit telt licht mee voor het klassement — de échte punten verdien je tijdens de wandeling.', 1, 2, 'De 6 ''Tijdlijn''-vragen vormen de scorende kern; overige vragen geven bonuspunten.') on conflict (id) do nothing;
insert into background_cards (id, title, body, sort_order) values ('wu-bg-1', 'Een palimpsest', 'Jackson Heights is in honderd jaar minstens zes keer ''overschreven'' — Anglo-Amerikaans, Joods, Latijns-Amerikaans, Zuid-Aziatisch, Himalayaans, post-pandemisch — zonder dat een laag de vorige wiste. Je ziet ze allemaal tegelijk.', 0) on conflict (id) do nothing;
insert into background_cards (id, title, body, sort_order) values ('wu-bg-2', 'Gebouwd om buiten te sluiten', 'De buurt werd rond 1910 ontworpen als exclusieve, witte enclave, compleet met uitsluitingsclausules. Ze werd uitgerekend de meest diverse plek op aarde. Die ironie is de rode draad van de dag.', 1) on conflict (id) do nothing;
insert into background_cards (id, title, body, sort_order) values ('wu-bg-3', 'The International Express', 'De 7-metrolijn die de buurt ontsluit kreeg de bijnaam ''the International Express'' omdat hij door tientallen immigrantengemeenschappen rijdt.', 2) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('wu-q1', 'warmup', 'mc', 'In welk stadsdeel van New York ligt Jackson Heights?', '["Queens","Brooklyn","The Bronx","Manhattan"]'::jsonb, 0, null, 1, false, false, 0, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('wu-q2', 'warmup', 'mc', 'Hoeveel talen worden er naar schatting in Jackson Heights gesproken?', '["Rond de 20","Rond de 60","Meer dan 160","Precies 100"]'::jsonb, 2, null, 1, false, false, 1, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('wu-q3', 'warmup', 'mc', 'Welke metrolijn heet ''the International Express''?', '["De 1","De 7","De A","De L"]'::jsonb, 1, null, 1, false, false, 2, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('wu-q4', 'warmup', 'mc', 'Wat is een ''palimpsest''?', '["Een soort metroplattegrond","Perkament dat is afgekrabd en opnieuw beschreven, met de oude tekst nog vaag zichtbaar","Een Colombiaans gerecht","Een art-decostijl"]'::jsonb, 1, null, 1, false, false, 3, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('wu-q5', 'warmup', 'open', 'Wat verwacht je van een buurt met meer dan 160 talen? Schrijf in één zin wat je nieuwsgierig maakt.', null, null, 'Geen goed/fout — host beoordeelt op betrokkenheid; geef iedereen die iets zinnigs schrijft het punt.', 1, false, false, 4, true) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s0', 0, 'Cannelle Patisserie', true, '75-59 31st Ave', 'Het heden', 'Vóór de tijdreis', 'Croissant', 'Voor we 100 jaar teruggaan, beginnen we in het heden. Pak een croissant en kijk om je heen in de rij.', 'Een Frans–Sri Lankaanse bakkerij; in de rij staan Latino''s, Zuid-Aziaten, zwarte en witte New Yorkers — voor dezelfde croissant. Onthoud dit beeld. Vandaag zoeken we uit hóé dit ontstond op een plek die ooit werd gebouwd om precies deze mensen buiten te houden.', 'Cannelle is een symbool zonder folklore: geen festival, gewoon een zondagochtend waarop de hele wereld in dezelfde rij staat. Het is het ''antwoord'' van vandaag op de vraag die de hele tour stelt — om daarna terug te spoelen naar 1910.', 0) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s1', 1, 'The Chateau — De Utopie', false, 'Historic District, 81st St & 34th Ave', '1910s', '1 · Utopie', null, 'Welkom op de vlakste ''Heights'' van New York. Brede straten, slate daken, geen winkel te zien — dit was honderd jaar geleden een belofte. En let op: we staan nú al op de 34th Avenue Open Street. Onthoud deze straat — we eindigen hier.', 'Geen heuvel. Dit heette ''Trains Meadow''. De Queensboro Corporation plakte er ''Heights'' op omdat het deftig klonk, en ''Jackson'' naar een wegenbaron. Het is het eerste stukje marketing in een buurt die later wereldberoemd werd om het tegenovergestelde van wat de bedenkers wilden. De tuinappartementen met verborgen binnentuinen werden gebouwd voor witte middenklasse-Manhattanieten, mét een uitsluitingsclausule op papier. Diezelfde architectuur huisvest nu de meest diverse populatie ter wereld.', 'Begin 20e eeuw ontsloten de Queensboro Bridge (1909) en de metro dit weiland voor forensen. De Queensboro Corporation (Edward MacDougall) bedacht er een prestige-merknaam bij en introduceerde de ''garden apartment'': blokken rond een afgeschermde, gedeelde binnentuin. De uitsluiting zat in ''restrictive covenants'' — juridische clausules tegen Joden en zwarte Amerikanen, pas in 1948 onafdwingbaar verklaard (Shelley v. Kraemer).', 1) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s1-q1', 's1', 'open', 'Deze buurt heet ''Heights''. Hoe hoog ligt het hoogste punt — en waarom heet het dan zo?', null, null, 'Het is plat (oud weiland ''Trains Meadow''); ''Heights'' is marketing om prestige te suggereren.', 2, true, false, 0, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s1-q2', 's1', 'mc', 'Welke groepen mochten hier oorspronkelijk volgens de aktes níét wonen?', '["Joden, zwarte Amerikanen en ''non-Aryans''","Ieren en Italianen","Niemand — het stond voor iedereen open","Alleen niet-Engelssprekenden"]'::jsonb, 0, null, 1, false, false, 1, true) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s2', 2, 'Methodist Church — De Eerste Scheuren', false, '81-10 35th Ave', '1930s–50s', '2 · Scheuren', null, 'In dit doodgewone kerkgebouw is in 1938 iets bedacht dat in honderden miljoenen huiskamers belandde. Hint: het gaat over taal — en over een man zonder baan.', 'Scrabble — uitgevonden in een gebouw waar nu in zes-plus talen wordt gepreekt (vandaag delen drie gemeenten het: Engels, Spaans, Mandarijn). En precies in deze jaren brak de witte utopie: Joden en homoseksuele mannen waren de eersten die er niet hoorden te zijn maar tóch kwamen. De clausule brokkelde af; de buurt begon te lekken.', 'De Depressie maakte exclusiviteit economisch onhoudbaar; lege appartementen moesten verhuurd. Alfred Mosher Butts, een werkloze architect, analyseerde de letterfrequentie van het Engels (door NYT-voorpagina''s te tellen) om de puntwaarden te bepalen — vandaar de zeldzame, dure Q en Z. Hij testte het spel in deze gemeenschap.', 2) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s2-q1', 's2', 'open', 'Welk wereldberoemd bordspel is hier in 1938 bedacht — en wat was het beroep van de bedenker?', null, null, 'Scrabble; de bedenker (Alfred Butts) was een werkloze architect. Beide nodig voor het volle punt.', 2, true, false, 0, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s2-q2', 's2', 'mc', 'Welke twee groepen ''lekten'' als eerste de witte utopie binnen in de jaren ''40?', '["Joodse New Yorkers en homoseksuele mannen","Colombianen en Mexicanen","Tibetanen en Nepalezen","Ierse en Italiaanse arbeiders"]'::jsonb, 0, null, 1, false, false, 1, true) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s3', 3, 'De Latino-hoek — La Pequeña Colombia ↔ Terraza 7', false, '83-27 Roosevelt Ave + Gleane St', '1950s ↔ nu', '2½ + 6 · Latino', 'Empanada / arepa', 'Hier begint Latijns-Amerika in Jackson Heights — niet in de jaren ''90, veel eerder. Eén gemeenschap was de voorhoede. En één blok verderop staat een bar waarvan de eigenaar zegt dat het géén bar is, maar verzet. Raad: welke gemeenschap, welk decennium — en verzet tegen wat?', 'Colombianen, vanaf de jaren ''50, ruim vóór iedereen. Dit deel heette decennialang ''Little Colombia'' / Chapinero, naar een wijk in Bogotá. Ketenmigratie: wie er is, haalt de volgende — een neef, een heel dorp uit Tolima. De arepa is een maïskoek (de Salvadoraanse pupusa is dikker en gevuld). En Terraza 7 van Freddy Castiblanco framet zich expliciet als verzet tegen gentrificatie — dezelfde gemeenschap, zeventig jaar later, vechtend om te blijven.', 'De Colombiaanse emigratie kwam mede op gang door La Violencia (ca. 1948–1958), de bloedige Colombiaanse strijd die mensen het land uit dreef. Roosevelt Avenue groeide uit tot de slagader van een hele Latijns-Amerikaanse economie: remittances (migranten sturen wereldwijd >½ biljoen $/jr naar huis, meer dan alle ontwikkelingshulp), maar ook valse documenten, zichtbaar sekswerk en de bailaderos — dancings waar een migrant voor een paar dollar een dans koopt en eerst telefoonfoto''s van de kinderen thuis laat zien.', 3) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s3-q1', 's3', 'mc', 'Welke Latino-gemeenschap kwam als eerste — en in welk decennium?', '["Colombianen, jaren ''50 (vóór de Aziaten)","Mexicanen, jaren ''90","Dominicanen, jaren ''70","Ecuadorianen, jaren ''80"]'::jsonb, 0, null, 1, false, false, 0, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s3-q2', 's3', 'mc', 'Proef de arepa. Van welk graan is hij gemaakt?', '["Maïs","Tarwe","Rijst","Gerst"]'::jsonb, 0, null, 1, false, false, 1, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s3-q3', 's3', 'open', 'Terraza-eigenaar Freddy Castiblanco noemt zijn zaak ''verzet''. Verzet tegen wat?', null, null, 'Tegen gentrificatie / verdringing van de gemeenschap.', 2, false, false, 2, true) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s4', 4, 'Little India — De Omslag', false, '74th St & 37th Ave', '1965', '3 · De Omslag', 'Samosa / paan', 'Bijna élke gemeenschap die we vandaag zien, voert haar aankomst terug op één wet, uit één jaar. Wie raadt het jaar? En: wie kwamen als eersten binnen — en wat voor werk deden ze?', '1965, de Immigration & Nationality Act (Hart-Celler), schrapte de raciale quota en opende migratie uit Azië. De eersten waren vaak hoogopgeleid — de wet gaf voorrang aan artsen, ingenieurs, diamanthandelaren. Suketu Mehta kwam in 1977. Het heilige adres was Sam & Raj: apparaten op 110 én 220 volt; sprak je Gujarati, dan geen btw. En de Partition van 1947 verklaart waarom Indiërs, Pakistani en Bangladeshi hier als aparte gemeenschappen naast elkaar wonen.', 'Tussen 1924 en 1965 blokkeerden ''national origins quotas'' Aziatische migratie bijna volledig. Hart-Celler (getekend aan de voet van het Vrijheidsbeeld) verving dat door beroepskwalificatie en gezinshereniging — en ontketende de grootste niet-Europese migratiegolf in de Amerikaanse geschiedenis. De Partition van 1947 sneed Brits-Indië langs religieuze lijnen in tweeën (ca. 1 miljoen doden, 10–15 miljoen ontheemden); in 1971 scheidde Bangladesh zich af.', 4) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s4-q1', 's4', 'open', 'Eén wet uit één jaar verklaart bijna alle migratie hier. Welk jaar — en wat deed die wet?', null, null, '1965, de Immigration & Nationality Act (Hart-Celler): schrapte de raciale nationale quota en opende migratie uit Azië. Jaartal + strekking nodig.', 2, true, false, 0, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s4-q2', 's4', 'mc', 'Welk type beroep hadden veel van de eerste Indiase migranten — en waarom?', '["Artsen/ingenieurs/academici — de wet gaf voorrang aan hooggeschoolden","Landarbeiders — er was vraag naar oogstwerk","Zeelieden — via de haven","Studenten — via uitwisseling"]'::jsonb, 0, null, 1, false, false, 1, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s4-q3', 's4', 'mc', 'Welke gebeurtenis maakte India en Pakistan in 1947 tot aparte landen?', '["De Partition (deling van Brits-Indië)","De Tweede Wereldoorlog","De stichting van de VN","Een staatsgreep"]'::jsonb, 0, null, 1, false, false, 2, true) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s5', 5, 'Diversity Plaza — De Himalaya', false, '73-19 37th Rd (Phayul op 74th St)', '1990s–nu', '5 · De Himalaya', 'Momo (blindtest)', 'Dit heet Diversity Plaza, maar kijk preciezer: dit is vooral de Himalaya. En dat filmpaleis daar heeft vier levens geleid. Eerst proeven, dan vertel ik welke.', 'De nieuwste laag: Tibetanen, Nepalezen, Bhutanezen en de Bengaalse gemeenschap. Het gebouw: art-deco-bioscoop ''The Earle'' (jaren ''30) → pornofilms (jaren ''70) → Bollywood-theater ''The Eagle'' (jaren ''80; één letter veranderd om kosten te sparen, G in ander lettertype) → nu Zuid-Aziatisch food court. Eén gevel, vier levens. En veel Tibetanen zijn geen economische migranten maar vluchtelingen/ballingen na de Chinese annexatie van Tibet.', 'Na de annexatie van Tibet (vanaf 1950) en de vlucht van de Dalai Lama (1959) ontstond een wereldwijde Tibetaanse diaspora; een bepaling in de Amerikaanse immigratiewet van 1990 wees duizend visa toe aan ontheemde Tibetanen, die via India en Nepal in Queens terechtkwamen. Diversity Plaza is sinds 2012 autovrij — een vroege voorbode van de Open Street waar de tour eindigt.', 5) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s5-q1', 's5', 'open', 'Dat filmpaleis heette ''The Earle'', daarna ''The Eagle''. Wat veranderden de eigenaren — en waarom maar dát?', null, null, 'Eén letter (Earle → Eagle), om kosten te sparen; ze wilden niet in een heel nieuw bord investeren.', 2, true, false, 0, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s5-q2', 's5', 'mc', 'Veel Tibetanen hier zijn niet zomaar migranten, maar iets specifiekers. Wat?', '["Vluchtelingen / ballingen (na de Chinese annexatie van Tibet)","Uitwisselingsstudenten","Seizoensarbeiders","Toeristen die bleven"]'::jsonb, 0, null, 1, false, false, 1, true) on conflict (id) do nothing;
insert into activities (id, stop_id, title, body, sort_order) values ('s5-act-momo', 's5', 'Momo-blindtest', 'Proef momo''s van twee/drie plekken en raad welke Tibetaans en welke Nepalees is. De host beoordeelt.', 0) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s6', 6, 'Arepa Lady — Renewal', false, '77-17 37th Ave', 'late 80s → nu', '6 · Renewal', 'Arepa', 'We zijn nu in de jaren ''90 — het dieptepunt van de buurt, en tegelijk de eerste groene scheuten. Dit is er één van. Raad: hoe begon de Arepa Lady?', 'María Piedad Cano begon eind jaren ''80 op een hoek van Roosevelt arepa''s te bakken op een straatkar. Ze werd een symbool; haar familie runt nu een restaurant — de informele economie die zich institutionaliseert. De schaduw: tuinappartementen van ooit 300k naderen het miljoen, en nieuwe torens vragen documenten die een migrant niet heeft → meer kelderwoningen, soms ''hot beds''.', 'Stadsplanner Amanda Burden vergeleek gentrificatie ooit met cholesterol: er is een goede soort (inkomensdiversiteit) en een slechte (verdringing van wie de buurt maakte). In JH zit het venijn vooral in documentatie: ook legale nieuwkomers hebben vaak geen kredietgeschiedenis of referenties.', 6) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s6-q1', 's6', 'mc', 'Hoe verkocht de Arepa Lady (María Piedad Cano) haar arepa''s oorspronkelijk?', '["Vanaf een straatkar","In een chic restaurant","Online","Op de Greenmarket"]'::jsonb, 0, null, 1, false, false, 0, true) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s6-q2', 's6', 'open', 'Een oud-stadsplanner vergeleek gentrificatie met cholesterol. Wat bedoelde ze?', null, null, 'Dat er goede én slechte gentrificatie bestaat (goede = inkomensdiversiteit; slechte = verdringing).', 2, false, false, 1, true) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s7', 7, 'Julio Rivera Corner — De Donkere Jaren', false, '78th St & 37th Ave', '1990', '4 · Donkere jaren', null, 'We stappen even terug in de tijd, naar de donkerste jaren. Lees in stilte het straatbordje. Eén minuut.', 'In 1990 werd Julio Rivera, een 29-jarige homoseksuele barman, door skinheads vermoord. Uit die moord ontstond de Queens Pride Parade, opgericht door buurtbewoner en leraar Danny Dromm. Vandaag heeft Jackson Heights de op één na grootste Pride van de stad én de grootste Latino-LGBTQ-scene — náást zeer conservatieve gemeenschappen. Mehta noemt dat geen ''tolerantie'' maar ''het zakken van de wapens''.', 'De jaren ''80–''90 waren het dieptepunt voor stad en buurt: criminaliteit, verval, aids. De zaak-Rivera werd een van de eerste in NY die als anti-homo hate crime werd vervolgd en mobiliseerde de gemeenschap; Dromm werd later een openlijk homoseksueel gemeenteraadslid. Het diepere punt: samenleven is hier geen harmonie maar functioneren ondanks onenigheid, geholpen door gedeelde ruimte en wetten die wél worden gehandhaafd.', 7) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s7-q1', 's7', 'open', 'Naar wie is deze hoek vernoemd — en welke jaarlijkse gebeurtenis komt rechtstreeks voort uit zijn dood in 1990?', null, null, 'Julio Rivera; de Queens Pride Parade (opgericht door Danny Dromm). Naam + gebeurtenis nodig.', 2, true, false, 0, true) on conflict (id) do nothing;
insert into activities (id, stop_id, title, body, sort_order) values ('s7-act-stilte', 's7', 'Stilteminuut', 'Eén minuut stilte; lees het straatbordje. Geen pathos.', 0) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s8', 8, 'Travers Park + 34th Ave Open Street — Het Nu', false, '76-09 34th Ave', 'nu (pandemie)', '6 · Nu', null, 'Nu komen we echt binnen waar we vanochtend op stonden. Weten jullie de cliffhanger nog — tijdens welke gebeurtenis ontstond deze autovrije straat?', 'In 2020 was Jackson Heights het epicentrum van de COVID-uitbraak in New York; de chauffeurs en bezorgers in de gedeelde kelders konden niet thuiswerken. Uit die ramp vocht de gemeenschap een autovrije straat af: twee mijl, dagelijks dicht voor verkeer, open voor leven. Nu ''de eerste superblock van New York''. Van exclusieve binnentuin (1910) naar inclusieve straat (2020) — het hele verhaal in één gebaar.', 'Elmhurst Hospital vlakbij werd het nationale symbool van een overbelast zorgsysteem. De Open Street wordt mede gedragen door buurtactivisten als Jim Burke en de open-streets-coalitie, met dagelijkse programmering voor kinderen en ouderen. Op zondag is er bovendien de Greenmarket bij Travers Park.', 8) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s8-q1', 's8', 'mc', 'Tijdens welke wereldgebeurtenis werd deze straat een ''superblock''? (cliffhanger van Stop 1)', '["De COVID-pandemie (2020)","9/11","De financiële crisis van 2008","De orkaan Sandy (2012)"]'::jsonb, 0, null, 2, true, false, 0, true) on conflict (id) do nothing;
insert into stops (id, number, name, optional, location, era, layer, food, intro, reveal, background, sort_order) values ('s9', 9, 'Jahn''s — Het Slot', false, '81-04 37th Ave (sinds 1897)', 'slot', 'Slot', 'Kitchen Sink Sundae for eight', 'We eindigen waar generaties JH-families eindigden — met iets wat je onmogelijk alleen op kunt.', 'Jahn''s, 1897, met de Kitchen Sink Sundae for eight — te groot om alleen op te eten, alleen samen te realiseren. Mehta: ''Dit is de belofte van de Nieuwe Wereld.'' We eindigen letterlijk waar we begonnen.', 'Gebruik het slot niet om te concluderen. De kracht van de tour is dat ze geen antwoord geeft. Stel de slotvraag en laat de groep het laatste woord.', 9) on conflict (id) do nothing;
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values ('s9-q1', 's9', 'open', 'Slotvraag (discussie, niet gescoord): Je hebt de wereld doorkruist zonder te vliegen. Wat zegt dat over de wereld? En over deze stad?', null, null, 'Geen goed/fout — discussie. Niet scoren; laat iedereen reageren.', 0, false, true, 0, true) on conflict (id) do nothing;
insert into activities (id, stop_id, title, body, sort_order) values ('s9-act-tally', 's9', 'Eindstand & de kers', 'Tel de Tijdlijn-score (6 vragen). De winnaar krijgt de kers van de sundae.', 0) on conflict (id) do nothing;
