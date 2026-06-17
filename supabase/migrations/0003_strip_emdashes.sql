-- =============================================================================
-- The Arrivals - 0003: vervang em-dashes (—) door gewone streepjes (-) in de
-- reeds-geseede content. Idempotent: opnieuw draaien is veilig (geen em-dashes
-- meer over). Draai dit in de Supabase SQL Editor.
-- =============================================================================

update app_settings set
  title           = replace(title, '—', '-'),
  subtitle        = replace(subtitle, '—', '-'),
  central_question= replace(central_question, '—', '-'),
  opening_line    = replace(opening_line, '—', '-'),
  closing_line    = replace(closing_line, '—', '-'),
  warmup_intro    = replace(warmup_intro, '—', '-'),
  timeline_note   = replace(timeline_note, '—', '-')
where id = 1;

update stops set
  name       = replace(name, '—', '-'),
  location   = replace(location, '—', '-'),
  era        = replace(era, '—', '-'),
  layer      = replace(layer, '—', '-'),
  intro      = replace(intro, '—', '-'),
  reveal     = replace(reveal, '—', '-'),
  background = replace(background, '—', '-');

update questions set
  prompt       = replace(prompt, '—', '-'),
  model_answer = replace(model_answer, '—', '-');

-- Opties staan als jsonb; vervang via tekst en cast terug.
update questions set
  options = replace(options::text, '—', '-')::jsonb
where options is not null;

update background_cards set
  title = replace(title, '—', '-'),
  body  = replace(body, '—', '-');

update activities set
  title = replace(title, '—', '-'),
  body  = replace(body, '—', '-');
