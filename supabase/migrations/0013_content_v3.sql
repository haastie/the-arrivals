-- =============================================================================
-- The Arrivals - 0013: tour v3 (structuur + vragen).
-- - Geen bakkerij-start meer: verwijder stop s0 (Cannelle).
-- - Stop 10 (Jahn's) wordt optioneel; de afsluiting verhuist naar Stop 9.
-- - Geen vraagtype-onderscheid meer: alles telt even zwaar (1 punt).
-- - Extra open vragen per stop (2-4 per stop), afgeleid uit het achtergronddossier.
-- Draai in de Supabase SQL Editor. Idempotent.
-- =============================================================================

-- 1) Bakkerij-start eruit ------------------------------------------------------
delete from questions where group_id = 's0';
delete from activities where stop_id = 's0';
delete from stops where id = 's0';

-- 2) Stop 10 optioneel; afsluiting bij Stop 9 ---------------------------------
update stops set optional = true where id = 's10';

-- 3) Nieuwe / aangepaste vragen (allemaal open, 1 punt) -----------------------
-- Stop 1: het coöperatie-model als zeef
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s1-q3', 's1', 'open', 'Wat maakte de uitsluiting hier zó duurzaam - wie besliste eigenlijk wie er kwam wonen?', null, null,
 'Het coöperatieve eigendomsmodel: bewoners bezaten niet alleen hun appartement maar mochten als collectief beslissen wie er nieuw introk. Daardoor was uitsluiting zelfregulerend - de buren deden het zelf, geen verhuurder nodig.',
 1, false, false, 3, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

-- Stop 2: Scrabble-letterfrequentie
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s2-q3', 's2', 'open', 'In Scrabble is de E goedkoop en de Q duur. Hoe bepaalde de bedenker hoeveel punten elke letter waard werd?', null, null,
 'Alfred Butts analyseerde de letterfrequentie van het Engels (onder meer door letters op de voorpagina van The New York Times te tellen). Veelvoorkomende letters (E) werden goedkoop en talrijk; zeldzame letters (Q, Z) duur en schaars.',
 1, false, false, 3, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

-- Stop 3: arepa-graan-mc VERVANGEN door La Violencia (open)
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s3-q3', 's3', 'open', 'Waarom kwamen juist Colombianen als eerste grote Latino-golf - en juist in de jaren ''50?', null, null,
 'La Violencia (ruwweg 1948-1958), de bloedige burgeroorlog-achtige periode in Colombia, dreef honderdduizenden het land uit. Jackson Heights bood goedkope huur in de half-leeggelopen utopie, de 7-metro naar werk in Manhattan, en ketenmigratie: de eersten haalden familie en dorpsgenoten na.',
 1, false, false, 3, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

-- Stop 6: eet-vraag (Kabab King op de NYT-100 van 2026 + Mamdani)
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s6-q4', 's6', 'open', 'Een restaurant uit deze buurt haalde de NYT-lijst van 100 beste restaurants (2026), en een bekende New Yorkse politicus at er demonstratief met zijn handen. Welk restaurant - en wie?', null, null,
 'Kabab King, en Zohran Mamdani (de New Yorkse burgemeesterskandidaat/-winnaar) at er met zijn handen. Een buurtgerecht dat mainstream gaat - en tegelijk een statement dat de immigrantenkeuken van Queens hét eten van de stad is.',
 1, false, false, 4, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

-- Stop 7: arepa-vraag (i.p.v. kelderwoningen)
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s7-q3', 's7', 'open', 'De Arepa Lady werd beroemd om haar arepa de choclo. Wat is een arepa eigenlijk - en waarom is juist deze zoet?', null, null,
 'Een arepa is een maïskoek. De arepa de choclo is gemaakt van choclo (zoete, jonge maïs), waardoor hij zoet smaakt - vaak geserveerd onder een deken van gesmolten kaas.',
 1, false, false, 3, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

-- Stop 8: LGBTQ / Queens Pride (geen Mehta)
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s8-q2', 's8', 'open', 'Uit de moord op Julio Rivera (1990) groeide de Queens Pride Parade. Wat is vandaag bijzonder aan de LGBTQ-positie van Jackson Heights?', null, null,
 'Jackson Heights heeft de op één na grootste Pride van de stad en de grootste concentratie Latino-LGBTQ-bars en -clubs van New York - en dat in een buurt die óók enkele van de meest conservatieve religieuze gemeenschappen huisvest.',
 1, false, false, 2, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

-- Stop 9 wordt het slot: COVID-epicentrum (open) + de verplaatste slotvraag
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s9-q2', 's9', 'open', 'Waarom werd juist Jackson Heights in het voorjaar van 2020 het epicentrum van de COVID-uitbraak in New York?', null, null,
 'Twee dingen tegelijk: extreme dichtheid (gedeelde kelderwoningen maakten isoleren vrijwel onmogelijk) én beroep - veel bewoners waren essentiële werkers (taxichauffeurs, bezorgers, schoonmakers, zorg) die niet konden thuiswerken.',
 1, false, false, 2, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s9-q3', 's9', 'open', 'Slotvraag (discussie, niet gescoord): Je hebt de wereld doorkruist zonder te vliegen. Van wie is deze buurt nu - en wie bepaalt dat morgen?', null, null,
 'Geen goed of fout - laat de groep het laatste woord. De kracht van de tour is dat ze presenteert en vraagt, en geen moraal oplegt.',
 1, false, true, 9, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

-- Stop 10 (optioneel): de oude slotvraag s10-q1 wordt de sundae-metafoor
insert into questions (id, group_id, type, prompt, options, correct_index, model_answer, points, is_timeline, discussion, sort_order, active) values
('s10-q1', 's10', 'open', 'Jahn''s'' handelsmerk is de Kitchen Sink Sundae for eight - te groot om alleen op te eten. Waarom is dat de perfecte slotmetafoor voor deze buurt?', null, null,
 'Je krijgt de coupe alleen samen leeg - net als de buurt, die functioneert doordat mensen die elkaar niet kozen tóch dezelfde stoep, hetzelfde gebouw en dezelfde ruimte delen.',
 1, false, false, 1, true)
on conflict (id) do update set group_id=excluded.group_id, type=excluded.type, prompt=excluded.prompt, options=excluded.options, correct_index=excluded.correct_index, model_answer=excluded.model_answer, points=excluded.points, is_timeline=excluded.is_timeline, discussion=excluded.discussion, sort_order=excluded.sort_order, active=excluded.active;

-- 4) Alles telt even zwaar: 1 punt, geen tijdlijn-vlag -------------------------
update questions set points = 1;
update questions set is_timeline = false;
