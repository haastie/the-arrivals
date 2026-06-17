-- =============================================================================
-- The Arrivals - 0007: balanceer de tour-meerkeuzevragen.
-- Juiste antwoorden gelijkmatig over A/B/C/D (was 11x A) en afleiders
-- qua lengte/nuance gelijkgetrokken. Alleen options + correct_index wijzigen.
-- Draai in de Supabase SQL Editor. Idempotent.
-- =============================================================================

update questions set options = '["Voor welgestelde katholieke gezinnen; protestanten en Joden geweerd","Voor iedereen met voldoende geld, ongeacht geloof of afkomst","Voor witte protestanten; Joden, zwarte Amerikanen en katholieken geweerd","Voor Ierse en Italiaanse fabrieksarbeiders; niet-Engelstaligen geweerd"]'::jsonb, correct_index = 2 where id = 's1-q2';
update questions set options = '["Colombiaanse en Mexicaanse nieuwkomers","Joodse New Yorkers en homoseksuele mannen","Tibetaanse en Nepalese families uit de Himalaya","Ierse en Italiaanse fabrieksarbeiders"]'::jsonb, correct_index = 1 where id = 's2-q2';
update questions set options = '["Mexicanen, jaren ''90","Dominicanen, jaren ''70","Ecuadorianen, jaren ''80","Colombianen, jaren ''50"]'::jsonb, correct_index = 3 where id = 's3-q1';
update questions set options = '["Ecuadorianen","Colombianen","Indiërs","Tibetanen"]'::jsonb, correct_index = 0 where id = 's3-q2';
update questions set options = '["Tarwe","Rijst","Maïs","Gerst"]'::jsonb, correct_index = 2 where id = 's3-q3';
update questions set options = '["~6 miljard dollar","~65 miljard dollar","~6,5 biljoen dollar","~650 miljard dollar"]'::jsonb, correct_index = 3 where id = 's4-q1';
update questions set options = '["Tijdens de Golfoorlog (1991)","Na de aanslagen van 9/11 (2001)","Na de val van de Berlijnse Muur (1989)","Tijdens de COVID-pandemie (2020)"]'::jsonb, correct_index = 1 where id = 's5-q3';
update questions set options = '["De Partition van Brits-Indië","Het einde van de Tweede Wereldoorlog","De oprichting van de Verenigde Naties","Een militaire staatsgreep in Delhi"]'::jsonb, correct_index = 0 where id = 's5-q4';
update questions set options = '["De Japanse","De Koreaanse","De Vietnamese","De Nepalese"]'::jsonb, correct_index = 3 where id = 's6-q1';
update questions set options = '["Uitgenodigde gastarbeiders uit de regio","Studenten op uitwisseling","Vluchtelingen en politieke ballingen","Seizoensarbeiders in de bouw"]'::jsonb, correct_index = 2 where id = 's6-q2';
update questions set options = '["Vanuit een klein eethuis","Vanaf een straatkar op de hoek","Op de wekelijkse Greenmarket","Met een bestelbus langs de deur"]'::jsonb, correct_index = 1 where id = 's7-q1';
update questions set options = '["De COVID-pandemie (2020)","De aanslagen van 9/11 (2001)","De financiële crisis (2008)","Orkaan Sandy (2012)"]'::jsonb, correct_index = 0 where id = 's9-q1';
