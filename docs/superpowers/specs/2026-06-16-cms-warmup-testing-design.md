# Ontwerp — Database-CMS, sessie-loze warm-up & testbaarheid

**Datum:** 2026-06-16
**Project:** The Arrivals — Jackson Heights quiz/tour-app
**Status:** Goedgekeurd (ontwerp), klaar voor implementatieplan

## Aanleiding

Drie wensen van de host (Jelle), plus één blokkerende bug:

1. **Bug (al gefixt in deze ronde):** `host` kreeg `function gen_random_bytes(integer) does not exist`. Oorzaak: `gen_random_bytes` zit in het `extensions`-schema van Supabase, buiten de `search_path = public` van `create_session`. Opgelost door het secret te genereren uit `gen_random_uuid()` (core). De DB-functie moet opnieuw gedraaid worden (`create or replace`). Dit deblokkeert ook "deelnemer kan alleen joinen, niet aanmaken" (downstream van dezelfde bug).
2. **Thuis warm draaien** zonder een sessie te hoeven aanmaken/joinen.
3. **Makkelijker testen** of de hele flow werkt.
4. **Makkelijk vragen toevoegen.**

## Genomen beslissingen (via brainstorming)

| Vraag | Keuze |
| --- | --- |
| Telt de thuis-warm-up mee? | **Nee — puur oefenen.** Losse pagina, geen sessie, geen leaderboard. |
| Hoe vragen beheren? | **Database + admin-formulier (instant, geen redeploy).** |
| Wat verhuist naar de DB? | **Alles — volledige CMS** (stops, vragen, kaartjes, activiteiten, meta). |
| Beveiliging `/admin`? | **Geheime admin-link** (token in URL, geverifieerd in RPC's). |
| Testbaarheid? | **"Simuleer deelnemers"-knop + twee-tab-flow + README-testscript** (aanbeveling, goedgekeurd). |

## Kernomslag: statisch → database-CMS

Vandaag is alle content gebundeld in `content_seed.json`. Voortaan is de **database de bron van waarheid** voor alle content. De seed wordt eenmalig in de DB geladen via een gegenereerde migratie en blijft in de repo als **back-up/herstelpunt**.

Gevolg: content wordt bij het laden van de app uit de DB gehaald en gecachet (niet meer uit de bundle). De warm-up is daardoor niet meer puur-offline — geaccepteerd, want "thuis oefenen" gaat over wifi.

## Datamodel (nieuwe content-tabellen)

Naast de bestaande `sessions` / `participants` / `answers`:

- **`app_settings`** (singleton, één rij): `title`, `subtitle`, `language`, `date`, `central_question`, `opening_line`, `closing_line`, `mc_points`, `open_points`, `timeline_note`.
- **`stops`**: `id` (text, bv. `s1`), `number`, `name`, `optional`, `location`, `era`, `layer`, `food`, `intro`, `reveal`, `background`, `sort_order`.
- **`background_cards`**: `id`, `title`, `body`, `sort_order` (warm-up-leeskaartjes).
- **`questions`**: `id` (text, bv. `s1-q1`), `group_id` (`warmup` of een stop-id), `type` (`mc`/`open`), `prompt`, `options` (jsonb array, null bij open), `correct_index` (int, null bij open), `model_answer` (text, null bij mc), `points`, `is_timeline` (bool), `discussion` (bool), `sort_order`, `active` (bool).
- **`activities`**: `id`, `stop_id`, `title`, `body`, `sort_order`.
- **`admin_config`** (singleton): `admin_secret` (text). **Niet leesbaar voor anon** (geen select-grant); alleen vergeleken binnen RPC's.

`timelineQuestionIds` vervalt als opgeslagen lijst en wordt afgeleid uit `questions.is_timeline = true`.

### RLS / rechten
- Content-tabellen (`app_settings`, `stops`, `background_cards`, `questions`, `activities`): **publiek lezen** (anon select) zodat de app + `/warmup` de content kunnen ophalen. Realtime is niet nodig (content is semi-statisch; `/admin` herlaadt na een bewerking).
- `admin_config`: geen anon-select. Alleen via RPC vergeleken.
- **Alle content-writes via `SECURITY DEFINER`-RPC's** die het `admin_secret` verifiëren (zelfde patroon als `host_secret`).

## Content laden in de app

Eén **`ContentProvider`** (React context) haalt bij het opstarten alle content op (settings, stops, cards, questions, activities) en cachet die in geheugen (+ optioneel localStorage voor snelle herstart). Componenten gebruiken **`useContent()`** i.p.v. de huidige statische imports uit `src/content/content.ts`.

De bestaande helper-vorm blijft behouden — `findQuestion(id)`, `findActivity(id)`, `stopsWithQuestions`, `isTimelineQuestion(id)` — maar werkt op de opgehaalde data i.p.v. op de gebundelde JSON. Dit is de **grootste refactor**: elke pagina/component die nu uit `content.ts` importeert schakelt over op de hook. Mechanisch, goed te overzien, te dekken met een handvol checks.

`/admin` roept na elke bewerking een `refetch()` aan zodat wijzigingen direct zichtbaar zijn.

## `/admin` — geheime link

- Route `/admin`. De sleutel komt uit `?key=<admin_secret>` (of uit localStorage als die eerder is ingevoerd) en wordt lokaal onthouden.
- Geldigheid wordt geverifieerd via een RPC (bv. `admin_check(secret)`); bij ongeldig een nette melding.
- CMS-UI met formulieren om **alles** te bewerken:
  - **Vragen**: toevoegen/bewerken/verwijderen; kiezen type (mc/open), opties + juist antwoord (mc), modelantwoord (open), punten, 🕰️ tijdlijn-vlag, koppeling aan stop of warm-up, volgorde, actief-vlag.
  - **Stops**, **kaartjes**, **activiteiten**, **meta-teksten**: bewerken.
- Schrijfacties: RPC's `admin_upsert_question`, `admin_delete_question`, `admin_upsert_stop`, `admin_upsert_card`, `admin_upsert_activity`, `admin_update_settings` — elk verifieert `admin_secret`.
- Wijzigingen zijn **direct live** voor nieuwe sessies en bij refetch (geen redeploy).

## `/warmup` — thuis oefenen (telt niet)

- Losse, sessie-loze, deelbare pagina.
- Leest warm-up-kaartjes + warm-up-vragen (`group_id = 'warmup'`, `active = true`) uit de DB.
- Scoort **lokaal** in de browser; voortgang in localStorage. Schrijft **niets** naar de DB; raakt geen sessie/leaderboard.
- Optioneel: ook de stop-achtergronden "lees alvast" (zonder reveals), net als nu in de in-sessie warm-up.

### Gevolg voor scoring (gedragswijziging t.o.v. handoff — expliciet goedgekeurd)
De **tellende in-sessie warm-up vervalt**. Scoren gebeurt **volledig in de live-tour**. De warm-up is overal puur oefenen. De sessiefase `warmup` blijft bestaan als **lobby** (host verzamelt de groep; deelnemers kunnen ondertussen oefenen). De RPC `submit_warmup_answer` vervalt; `participants.score` wordt alleen nog in live-modus opgebouwd.

## Veiliger scoren

Omdat `correct_index` en `points` nu in de DB staan, leest `host_reveal_mc` die waarden **zelf uit de `questions`-tabel** i.p.v. ze van de client te vertrouwen. `host_judge_open` leest `points` uit de DB. Dit elimineert client-supplied scoring.

## Testbaarheid

1. **"Simuleer deelnemers"-knop** in de host-console (achter admin/dev-flag): voegt N nepdeelnemers toe en laat ze automatisch een geldig antwoord insturen op de actieve vraag. Via RPC's `add_test_participant(session_id, name)` en `simulate_answers(session_id, question_id)`. Zo test je solo de hele keten: tally → sluiten → onthullen → auto-score → leaderboard.
2. **Twee-tab-flow** gedocumenteerd: host in normaal venster, deelnemer in incognito/ander toestel.
3. **README-testscript**: stap-voor-stap lokaal end-to-end testen, inclusief de simulatieknop.

## Wat NIET verandert

- De live-flow (host pusht vraag → telefoons springen mee).
- Het `sessions` / `participants` / `answers`-model en de bestaande host-acties (push/lock/reveal/judge/adjust/activity).
- De Nederlandse toon, mobile-first UI en de bestaande componentstructuur (m.u.v. de overstap naar `useContent()`).

## Migraties

- **`0001_init.sql`**: blijft (sessions/participants/answers + host-RPC's), **met de `gen_random_bytes`-fix**. `host_reveal_mc`/`host_judge_open` worden aangepast om scores uit de DB te lezen; `submit_warmup_answer` vervalt.
- **`0002_cms.sql`** (nieuw): content-tabellen + `admin_config` + RLS/grants + admin- en test-RPC's, en **vult de tabellen met de huidige seed** (gegenereerd uit `content_seed.json`). Idempotent waar mogelijk.
- `content_seed.json` blijft als canonieke back-up in de repo en als bron voor de seed-inserts.

## Acceptatiecriteria

- [ ] Host kan een sessie aanmaken zonder `gen_random_bytes`-fout; deelnemers krijgen een join-code.
- [ ] `/warmup` werkt zonder sessie/login, scoort lokaal, schrijft niets naar de DB, is als losse link deelbaar.
- [ ] Alle content (stops, vragen, kaartjes, activiteiten, meta) komt uit de DB; de app toont identieke inhoud als de huidige seed na het laden van `0002`.
- [ ] `/admin` met geldige sleutel kan een vraag toevoegen/bewerken/verwijderen die **zonder redeploy** in een nieuwe sessie verschijnt; zonder geldige sleutel geen toegang.
- [ ] Deelnemers/anon kunnen het `admin_secret` niet uitlezen.
- [ ] mc-onthulling scoort op basis van DB-waarden (niet client-supplied).
- [ ] "Simuleer deelnemers" laat de host solo de volledige live-flow testen.
- [ ] Bestaande live-flow, leaderboard, slotscherm en Tijdlijn-winnaar blijven werken.

## Openstaande risico's / aandachtspunten

- **Refactor-breedte:** de overstap van statische imports naar `useContent()` raakt veel bestanden; mechanisch maar moet zorgvuldig (geen component mag nog direct uit `content.ts` lezen behalve de provider).
- **Laadmoment:** de app moet een laadstatus tonen terwijl content uit de DB komt; offline werkt de warm-up niet meer.
- **Seed-generatie:** de INSERT-migratie wordt gegenereerd uit `content_seed.json`; let op correcte escaping van de lange Nederlandse teksten (apostrofs).
