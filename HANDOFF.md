# HANDOFF — "The Arrivals" Quiz & Tour-app
### Brief voor Claude Code

Je bouwt een **mobiele web-app** voor een wandeltour door Jackson Heights, Queens. Twee gebruikersrollen, één codebase:

1. **Deelnemers** (4–8 personen, telefoon): vooraf een **zelf-gestuurde warm-up** met achtergrondinfo en een paar quizvragen; tijdens de tour een **live modus** waarin hun scherm meebeweegt met wat de gids triggert.
2. **Host/gids** (Jelle, telefoon): een **master-control** om de sessie te starten, vragen live naar de groep te pushen, **open antwoorden zelf te beoordelen** (✓/✗ → punten), het juiste antwoord te onthullen en het **leaderboard** te bewaken.

De volledige inhoud (stops, vragen, antwoorden, achtergrondteksten) staat in **`content_seed.json`** in deze map. Dat bestand is de bron van waarheid voor alle content — laad het in de app-bundle. Taal van de hele UI en content: **Nederlands**.

---

## 1. Belangrijkste beslissingen (al genomen — niet heroverwegen)
- **Modi:** beide. Warm-up = zelf-gestuurd. Tijdens tour = live, host-bestuurd.
- **Score:** individueel **leaderboard met namen**.
- **Open vragen:** sommige vragen zijn vrije tekst; de **host beoordeelt** live of een antwoord goed is en kent punten toe.
- **Taal:** Nederlands.
- **Doelgroep-omvang:** 4–8 deelnemers (ontwerp veilig tot ~25).

## 2. Aanbevolen stack
- **Frontend:** React + Vite + TypeScript + Tailwind CSS. Mobile-first. Lichte transities (framer-motion mag, optioneel).
- **Realtime + data:** **Supabase** (Postgres + Realtime). Gratis tier volstaat ruimschoots. (Alternatief als je dat sterker vindt: Firebase Firestore — maar lever dan dezelfde features. Default = Supabase.)
- **QR-join:** `qrcode.react` voor een join-QR op het master-scherm.
- **Hosting:** Vercel voor de frontend; Supabase als backend. Lever een werkende `vercel`-deploy en documenteer de env-vars.
- **State:** content (stops/vragen) staat **statisch** in de app uit `content_seed.json`. Supabase houdt alleen **live sessie-state** bij (sessies, deelnemers, antwoorden). Dit houdt het goedkoop en simpel.

## 3. Routes / schermen
- `/` — landing: korte intro + knoppen "Doe mee" en (klein, onderaan) "Host".
- `/join` — naam invoeren + 6-cijferige sessiecode (of via QR-deeplink `/join?code=XXXX`).
- `/play` — deelnemersapp (warm-up of live, afhankelijk van sessiefase).
- `/master` — host-control (achter een hostgeheim/secret link).

## 4. Datamodel (Supabase / Postgres)
```sql
-- Een tour-sessie (één per groep/dag)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,           -- bv. "JH2126"
  host_secret text not null,                -- random token; alleen wie dit heeft mag besturen
  phase text not null default 'warmup',     -- 'warmup' | 'live' | 'finished'
  active_question_id text,                  -- bv. "s4-q1" (verwijst naar content_seed.json)
  active_status text not null default 'idle', -- 'idle' | 'open' | 'locked' | 'revealed'
  created_at timestamptz default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  score int not null default 0,
  joined_at timestamptz default now()
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  question_id text not null,                -- verwijst naar content_seed.json
  response text,                            -- gekozen optie-index (mc) of vrije tekst (open)
  status text not null default 'pending',   -- 'pending' | 'correct' | 'incorrect'
  awarded_points int not null default 0,
  created_at timestamptz default now(),
  unique (participant_id, question_id)      -- één inzending per vraag per persoon
);
```
**Realtime-abonnementen:**
- Deelnemer abonneert op zijn `sessions`-rij (fase, `active_question_id`, `active_status`) en op zijn eigen `answers`-rij (voor de uitslag) + op `participants` (leaderboard).
- Host abonneert op `participants` (leaderboard) en op `answers` van de actieve vraag (live binnenkomende inzendingen).

**RLS:** dit is een privé spel voor een kleine groep — houd security licht maar netjes. Sta anonieme inserts toe binnen een geldige sessie; bescherm host-acties via `host_secret` (server-side check of in een Supabase RPC/edge function). Documenteer dat dit bewust licht is.

## 5. Kernflows

### A. Warm-up (zelf-gestuurd, vóór de tour)
- Host maakt sessie → fase `warmup`. Deelnemer joint → ziet de warm-up: `content_seed.json → warmup.backgroundCards` (lees-kaartjes) en `warmup.questions` (zelf doorklikken; mc auto-gescoord, de open warm-up-vraag krijgt punt na host-beoordeling óf geef 'm automatisch het punt — zie `modelAnswer`).
- Optioneel kan de deelnemer ook de **achtergrond per stop** lezen (`stops[].background`) als "lees alvast"-sectie, zónder de tour-reveals te tonen (toon in warm-up NIET de `reveal`-velden).

### B. Live (tijdens de tour, host-bestuurd)
1. Host zet fase op `live`. Deelnemersschermen tonen "Wacht op de gids…".
2. Host kiest een stop → vraag uit de lijst en drukt **"Stuur naar groep"** → `active_question_id` + `active_status='open'`. Alle telefoons springen naar die vraag.
3. Deelnemer beantwoordt:
   - **mc:** tikt een optie → insert in `answers` (response = optie-index, status `pending`).
   - **open:** typt tekst → insert (response = tekst, status `pending`).
4. Host ziet live:
   - **mc:** een staafje per optie (aantal stemmen) + wie al geantwoord heeft.
   - **open:** een live-lijst van ingezonden teksten met naam.
5. Host drukt **"Sluiten"** → `active_status='locked'` (geen inzendingen meer).
6. Onthullen:
   - **mc:** host drukt **"Toon antwoord"** → `active_status='revealed'`; correcte optie wordt gemarkeerd op alle schermen; **auto-score**: wie de `correctIndex` koos krijgt `points` (update `answers.status` + `participants.score`).
   - **open:** host loopt de inzendingen langs en tikt per stuk **✓** of **✗** (✓ → `status='correct'`, `awarded_points = points`; ✗ → `incorrect`, 0). Daarna **"Toon modelantwoord"** (`stops[].questions[].modelAnswer`) → elke deelnemer ziet zijn eigen ✓/✗ + punten.
7. Host kan punten **handmatig bijstellen** (+/-) en naar de volgende vraag.
8. **Leaderboard** werkt overal live mee.

### C. Slot
- Host zet fase op `finished` → iedereen ziet de eindstand + de slotvraag (`s9-q1`, discussie, niet gescoord). Markeer de winnaar van de **Tijdlijn-score** (de 6 vragen in `meta`/`timelineQuestionIds`).

## 6. Vraagtypes (uit content_seed.json)
- `type: "mc"` → `options[]` + `correctIndex` → **auto-scored**.
- `type: "open"` → `modelAnswer` (rubric voor de host) → **host-judged** (✓/✗).
- `isTimeline: true` → telt mee voor de scorende kern (6 stuks). Toon deze met een 🕰️-accent.
- `discussion: true` (alleen slotvraag) → niet scoren, alleen tonen.
- `activities[]` per stop (momo-blindtest, stilteminuut, eindstand) → host kan een **activiteitenkaart** naar de groep pushen (geen scoring; gewoon een instructie-scherm).

## 7. Design / toon
- Mobile-first, grote tikdoelen, hoog contrast (buiten in de zon leesbaar).
- Toon = documentaire-meets-buurtwandeling: warm, nieuwsgierig, niet kinderachtig. Een knipoog naar meertaligheid (bv. een subtiele "hola / namaste / tashi delek" in de header) mag.
- Per stop een duidelijke koptekst met **stopnummer, naam, era/laag**.
- Duidelijk verschil tussen "wachten", "actieve vraag", "ingezonden", "onthuld".

## 8. Bouwvolgorde (milestones)
1. Scaffold (Vite+React+TS+Tailwind), routing, `content_seed.json` inladen, basis-styling.
2. Supabase: schema migratie, client-setup, env-vars. Create-session (host) + join (deelnemer) + lobby met live deelnemerslijst.
3. Warm-up: lees-kaartjes + zelf-gestuurde vragen (mc auto-score; open → host of auto-punt).
4. Live-modus skelet: fase-switch, "stuur naar groep", deelnemer-actievevraag-scherm, inzenden.
5. mc: live-tally + sluiten + onthullen + auto-score.
6. open: host-beoordeling ✓/✗ + modelantwoord + per-deelnemer uitslag.
7. Leaderboard (live) + slotscherm + Tijdlijn-winnaar.
8. Activiteitenkaarten + QR-join + reconnect-robuustheid + Nederlandse copy-pass.
9. Deploy naar Vercel; README met setup- en deploystappen.

## 9. Acceptatiecriteria
- [ ] Host kan een sessie starten en deelt een join-code + QR.
- [ ] Deelnemers joinen met naam; verschijnen live in de lobby.
- [ ] Warm-up werkt zelf-gestuurd, inclusief achtergrond-leeskaartjes (zonder tour-reveals te spoilen).
- [ ] Host kan elke vraag live naar de groep pushen; telefoons springen direct mee.
- [ ] mc-vragen worden automatisch gescoord en correct onthuld.
- [ ] open-vragen: host ziet inzendingen live en kent per stuk punten toe; deelnemer ziet daarna eigen uitslag.
- [ ] Leaderboard met namen werkt live op host- en deelnemerscherm.
- [ ] Host kan punten handmatig bijstellen.
- [ ] Slotscherm toont eindstand + Tijdlijn-winnaar + slotvraag.
- [ ] Werkt op een telefoon over mobiel internet; herstelt netjes na korte verbindingsval.
- [ ] Live gedeployed op een deelbare URL.

## 10. Aannames die je mag maken (en in de README documenteren)
- Connectiviteit op straat is redelijk (Jackson Heights heeft goede dekking). Warm-up content wordt gebundeld zodat lezen ook offline kan; live-modus vereist verbinding.
- Eén host (Jelle). Host-toegang via geheime link met `host_secret`.
- Geen accounts/wachtwoorden voor deelnemers — alleen een weergavenaam per sessie.
- Eén actieve sessie tegelijk is genoeg, maar het model staat er meerdere toe.

## 11. Vragen aanvullen
- De host moet in de komende dagen nog vragen kunnen aanvullen

---
**Bron-content:** `content_seed.json` (deze map). Inhoudelijke verdieping staat in de losse documenten `The_Arrivals_VOLLEDIG.md`, `_SPIEKBRIEFJE.md` en `_ACHTERGROND.md` — handig als je extra tekst nodig hebt, maar de seed is leidend.
