-- =============================================================================
-- The Arrivals - 0004: nieuwe warm-up-intro die focust op de migratie en
-- diversiteit van Jackson Heights (i.p.v. de oude "Welkom. Voor zondag..."-tekst,
-- die ook nog naar de verwijderde kaartjes verwees). Draai dit in de Supabase
-- SQL Editor. Idempotent: opnieuw draaien zet dezelfde tekst.
-- =============================================================================

update app_settings set
  warmup_intro = 'Jackson Heights is in honderd jaar uitgegroeid tot misschien wel de meest diverse plek op aarde: meer dan 160 talen, golf na golf van migranten, lagen die elkaar nooit helemaal wisten. Voor we zondag de straat op gaan, een korte opwarmer over die migratie en diversiteit. Raad mee en kom alvast in de stemming. Dit telt niet mee voor het klassement - de echte punten verdien je tijdens de wandeling.'
where id = 1;
