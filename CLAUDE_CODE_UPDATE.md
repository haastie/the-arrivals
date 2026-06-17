# UPDATE-INSTRUCTIE voor Claude Code — "The Arrivals" app (v1 → v2)

De inhoud van de tour is herzien na een redactionele review. **Het meeste werk is content**, geen architectuur. Vervang de seed en pas een paar weergave-/scoringdetails aan. Hieronder een changelog + concrete taken.

## 0. Kernverandering in één zin
De content is uitgebreid van 10 naar **11 stops**, met een **herziene rode draad**, **gecorrigeerde feiten**, en **3 nieuwe stops**. De vragen worden tijdens de tour **live, op natuurlijke momenten ín het verhaal** gepusht (niet meer als blok aan het eind). De app pusht al per vraag, dus dit vraagt vooral dat de host de vragen in scriptvolgorde pusht — geen herbouw van de live-flow.

## 1. Vervang de content (verplicht)
- Vervang `content_seed.json` volledig door de nieuwe versie (v2) in deze map.
- Re-seed / herlaad de content in de app (statische bundle of DB, afhankelijk van je implementatie). **Behoud** het bestaande sessie-/leaderboard-mechanisme; alleen de content verandert.
- De seed bevat nu `"version": 2`. Gebruik dit eventueel om een cache te invalideren.

## 2. Wat er inhoudelijk veranderde (changelog)
**Nieuwe/gewijzigde stops:**
- **NIEUW s4 — "Roosevelt Avenue / Lorena Borjas"** (korte stop): informele economie + trans-activiste Lorena Borjas. Let op: `food` is hier `null` — zorg dat de UI een stop zonder eten netjes toont.
- **s5 — "Little India → 9/11"**: uitgebreid met een 9/11-/Special Registration-laag (nieuwe vraag `s5-q3`) en de "tweede verdiepingen"-vraag (`s5-q2`).
- **s2 — Methodist Church**: nu ook het Jewish Center; Scrabble-feit genuanceerd.
- **s3 — Latino-hoek**: toegevoegd dat **Ecuadorianen vandaag de grootste groep zijn** (nieuwe vraag `s3-q2`); demografie gecorrigeerd.
- Door de extra stop schuiven de nummers: er zijn nu **stops 0 t/m 10 (11 totaal)**.

**Gecorrigeerde feiten (belangrijk — de oude seed bevatte fouten):**
- Stop 1: de uitsluiting was "White Anglo-Saxon Protestants only" → **geweerd: Joden, zwarte Amerikanen, katholieken/Italianen/Grieken**. De oude term **"non-Aryans" is verwijderd** (onjuist/nazi-terminologie). Toegevoegd: het coöperatie-model als zeef.
- Stop 2: Scrabble heette in 1938 nog "Criss-Cross Words"; de naam "Scrabble" kwam in 1948 (Brunot).
- Stop 10 (Jahn's): de **keten** is van 1897, maar **deze vestiging sinds 1959** (niet "Jahn's sinds 1897").
- "Eerste superblock van NYC" → geformuleerd als "wordt beschreven als".

**Herziene rode draad (in `meta`):**
- `redThread`: "Van wie is deze buurt — en wie mag dat bepalen?"
- Nieuwe `openingLine`, `closingLine`, `landAcknowledgement` (Lenape), en `mechanism` (de "zeef die zich herhaalt").
- Als de app ergens de oude hoofdvraag/openingsregel toont (warm-up-intro, landing, slotscherm), **vervang die teksten door de nieuwe meta-velden**.

## 3. Weergave-/gedragstaken (klein)
- [ ] **Dynamisch aantal stops**: zorg dat lijsten/voortgang over `stops[]` itereren (nu 11). Hardcode nergens "10".
- [ ] **`food: null`** afhandelen (geen eet-badge tonen bij s4).
- [ ] **Meta-teksten tonen**: `openingLine`/`landAcknowledgement` op het startscherm of in de host-briefing; `closingLine` op het slotscherm; `redThread` evt. als subtitel.
- [ ] **Meerdere open vragen per stop**: stops hebben nu soms 2 open vragen (host-beoordeeld). De bestaande open-beoordelingsflow (✓/✗) moet hier gewoon mee werken — controleer dat.
- [ ] **`discussion: true`** vragen (s0-q1, s10-q1): tonen, **niet** scoren, geen ✓/✗ vereisen.

## 4. Scoring
- De scorende kern is nu **8 Tijdlijn-vragen** (was 6): zie `timelineQuestionIds` in de seed (en `isTimeline: true` per vraag).
- Zorg dat het **leaderboard / de "winnaar krijgt de kers"** de score op basis van `isTimeline` (of `timelineQuestionIds`) gebruikt. Overige vragen = bonus.
- `meta.scoring`: mc = 1 punt, open = 2 punten (ongewijzigd).

## 5. Interactie tijdens de tour (geen herbouw nodig)
- De vragen zijn in het script op natuurlijke momenten geplaatst. In de app betekent dit alleen: de host pusht ze **in scriptvolgorde** binnen een stop (intro → vraag → onthulling → soms nog een vraag).
- **Optioneel (nice-to-have):** toon in de master-view de vragen genest onder hun stop in scriptvolgorde, zodat de host ze in de juiste volgorde kan pushen. Niet verplicht.
- **Niet doen:** de warm-up mag nog steeds de `reveal`-velden van tour-stops **niet** tonen (anti-spoiler), net als in v1.

## 6. Acceptatiecriteria (delta)
- [ ] App toont 11 stops; s4 (Borjas) en de 9/11-laag bij s5 zijn aanwezig.
- [ ] Geen "non-Aryans" meer; Jahn's-tekst zegt "keten 1897 / vestiging 1959".
- [ ] Start-/slotteksten gebruiken de nieuwe `openingLine`/`closingLine`/`landAcknowledgement`.
- [ ] Leaderboard scoort op de 8 Tijdlijn-vragen; bonusvragen tellen apart.
- [ ] Open vragen met 2 stuks per stop werken in de host-beoordelingsflow.
- [ ] `discussion`-vragen worden getoond maar niet gescoord.

## 7. Suggestie-prompt om aan Claude Code te geven
> "Vervang content_seed.json door de nieuwe v2 in deze map en herlaad de content. Lees CLAUDE_CODE_UPDATE.md en voer de weergave-/scoringtaken uit: dynamisch aantal stops (nu 11), food:null afhandelen, de nieuwe meta-teksten (openingLine/closingLine/landAcknowledgement/redThread) tonen op start- en slotscherm, en het leaderboard laten scoren op timelineQuestionIds. Behoud de bestaande sessie-, realtime- en open-beoordelingsflow."
