# The Arrivals — Jackson Heights

Een mobiele web-app voor een **quiz-wandeling** door Jackson Heights, Queens.
Twee rollen, één codebase:

- **Deelnemers** (telefoon): zelf-gestuurde **warm-up** vooraf; tijdens de tour een
  **live modus** waarin hun scherm meebeweegt met wat de gids triggert.
- **Host/gids** (Jelle): een **master-control** om de sessie te starten, vragen live te
  pushen, open antwoorden te beoordelen (✓/✗), het juiste antwoord te onthullen en het
  **leaderboard** te bewaken.

Alle inhoud staat in [`content_seed.json`](./content_seed.json) — de **bron van waarheid**.
De seed wordt in de app-bundle gebakken, zodat de warm-up ook offline leesbaar is.
UI en content zijn volledig in het **Nederlands**.

---

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS v4 (mobile-first).
- **Realtime + data:** Supabase (Postgres + Realtime). Gratis tier volstaat.
- **QR-join:** `qrcode.react` op het master-scherm.
- **Hosting:** Vercel (frontend) + Supabase (backend).
- **State-model:** content is **statisch** (uit `content_seed.json`); Supabase houdt alleen
  **live sessie-state** bij (sessies, deelnemers, antwoorden).

## Routes / schermen

| Route      | Wat                                                                  |
| ---------- | -------------------------------------------------------------------- |
| `/`        | Landing: intro + "Doe mee", "Thuis oefenen" en (klein) "Host".       |
| `/join`    | Naam + 6-teken sessiecode (of via QR-deeplink `/join?code=XXXX`).    |
| `/play`    | Deelnemersapp (lobby of live, afhankelijk van de sessiefase).        |
| `/master`  | Host-control. Sessie + `host_secret` zitten in de URL (`?s=&secret=`).|
| `/warmup`  | Sessie-loze oefen-warm-up (thuis); scoort lokaal, telt **niet** mee. |
| `/admin`   | Content-CMS achter een geheime sleutel (`/admin?key=<admin_secret>`).|

---

## Setup

### 1. Dependencies

```bash
npm install
```

### 2. Supabase-project

Er is al een project aangemaakt: **`lsagvpllpdouwwjmiwrz`**
(URL: `https://lsagvpllpdouwwjmiwrz.supabase.co`).

1. Open het project op [supabase.com](https://supabase.com/dashboard/project/lsagvpllpdouwwjmiwrz).
2. **SQL Editor** → draai **beide** migraties op volgorde:
   - [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) — sessies, deelnemers,
     antwoorden, host-RPC's, realtime.
   - [`supabase/migrations/0002_cms.sql`](./supabase/migrations/0002_cms.sql) — content-tabellen
     (stops/vragen/kaartjes/activiteiten/meta), admin-RPC's, DB-gebaseerde scoring, testgereedschap,
     én de seed-content. Beide zijn idempotent — opnieuw draaien is veilig.
3. Zoek het **admin-secret** op (voor `/admin`):
   ```sql
   select admin_secret from admin_config;
   ```
4. **Project Settings → API** → kopieer de **`anon` public key**.

### 3. Env-vars

`.env.local` bestaat al met de project-URL ingevuld; vul alleen de anon-key aan:

```bash
VITE_SUPABASE_URL=https://lsagvpllpdouwwjmiwrz.supabase.co
VITE_SUPABASE_ANON_KEY=<plak hier de anon public key>
```

> Zolang de env-vars ontbreken toont de app een nette "backend nog niet verbonden"-melding
> i.p.v. te crashen.

### 4. Lokaal draaien

```bash
npm run dev
```

Open de **Network**-URL op je telefoon (zelfde wifi) om mobiel te testen. Open `/master` op de
hosttelefoon, maak een sessie, en join op een tweede toestel via `/join` of de QR.

### Lokaal end-to-end testen (in je eentje)

Je hebt geen tweede telefoon nodig:

1. Open `/master`, maak een sessie aan en zet de fase op **Wandeling**.
2. Push een vraag naar de groep ("Stuur").
3. In het blok **Testgereedschap**: klik een paar keer **+ Testdeelnemer**, daarna
   **Simuleer antwoorden** — de nepdeelnemers sturen een geldig willekeurig antwoord in.
4. Bekijk de live-tally, klik **Sluiten** → **Toon antwoord + score**, en zie het leaderboard
   updaten. Zo test je de hele keten zonder extra toestellen.
5. Voor een echte tweede speler: open `/join` in een **incognito-venster** (aparte localStorage).

---

## Deploy naar Vercel

1. Push deze map naar een Git-repo en importeer in Vercel (framework: **Vite**, auto-gedetecteerd).
2. Zet in **Project Settings → Environment Variables** (Production + Preview):
   - `VITE_SUPABASE_URL` = `https://lsagvpllpdouwwjmiwrz.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<anon public key>`
3. Deploy. [`vercel.json`](./vercel.json) bevat de SPA-rewrite zodat `/join`, `/play` en
   `/master` direct werken (client-side routing).

Of via de CLI:

```bash
npm i -g vercel
vercel        # preview
vercel --prod # productie
```

---

## Content beheren (host, komende dagen) — `/admin`

Alle content (stops, vragen, kaartjes, activiteiten, meta-teksten) staat in de **database** en
beheer je via de CMS op `/admin` — **instant, zonder redeploy**.

1. Open `/admin?key=<admin_secret>` (het secret uit `select admin_secret from admin_config;`).
   Je toestel onthoudt de sleutel daarna.
2. Kies een tab (Vragen / Stops / Kaartjes / Activiteiten / Instellingen) en klik **+ Nieuw** of
   **Bewerk**. Voor een vraag: kies type (**mc** met opties + juiste-optie-index, of **open** met
   modelantwoord), punten, en de 🕰️-vlag om mee te tellen voor de Tijdlijn-kern.
3. **Opslaan** → meteen live in nieuwe sessies. Laat een ID leeg voor een automatische ID.

> `content_seed.json` is nu een **back-up/seed-bron** (laadt de begin-inhoud via `0002_cms.sql`),
> niet meer de live bron. De DB is leidend; bewerk content via `/admin`.

### Warm-up thuis oefenen

Deel de link `/<jouw-domein>/warmup`. Spelers oefenen de warm-up-kaartjes en -vragen zonder sessie
of login. Het scoort lokaal in hun browser en **telt niet** mee voor het klassement.

---

## Security (bewust licht)

Dit is een privé spel voor een kleine groep; de beveiliging is **bewust licht maar netjes**
ingericht en hier gedocumenteerd:

- **RLS staat aan** op alle tabellen. De anon-rol mag content **lezen** (voor de app + `/warmup`)
  en sessie-state lezen (voor realtime); de kolom `host_secret` en de tabel `admin_config`
  worden **nooit** aan anon gegeven, ook niet in realtime-payloads.
- **Alle schrijfacties lopen via `SECURITY DEFINER`-RPC's** (zie de migraties). Host-acties
  (fase wisselen, vraag pushen, onthullen/scoren, punten bijstellen, testdeelnemers) verifiëren
  het **`host_secret`**; content-bewerkingen verifiëren het **`admin_secret`**.
- **Scoring leest uit de DB**: bij het onthullen van een mc-vraag of het beoordelen van een open
  vraag haalt de RPC `correct_index`/`points` uit de `questions`-tabel — niet van de client.
- **Warm-up** scoort puur lokaal in de browser en schrijft niets naar de DB (alleen oefenen).
- De host-link bevat het `host_secret`, en `/admin?key=` het `admin_secret` — **deel die links niet**.

## Aannames (uit de handoff)

- Content komt bij het opstarten uit de DB (over wifi/mobiel internet). De live-modus vereist
  verbinding; de app herstelt automatisch na een korte verbindingsval (volledige refetch bij
  her-verbinden, online-worden of terug-focussen).
- Eén host (Jelle), via geheime link met `host_secret`.
- Geen accounts/wachtwoorden voor deelnemers — alleen een weergavenaam per sessie.
- Eén actieve sessie tegelijk volstaat, maar het model staat er meerdere toe.

## Projectstructuur

```
content_seed.json                  # seed-bron / back-up (geladen via 0002_cms.sql)
scripts/generate-seed-sql.mjs      # genereert de seed-INSERTs uit content_seed.json
supabase/migrations/
  0001_init.sql                    # sessies/deelnemers/antwoorden + host-RPC's + realtime
  0002_cms.sql                     # content-tabellen + admin-RPC's + DB-scoring + test-RPC's + seed
src/
  content/                         # ContentProvider/useContent + DB→Content mapper
  lib/                             # supabase client, RPC-API's (host/admin/test), identity, scoring
  hooks/useGameState.ts            # realtime bron-van-waarheid + reconnect
  components/                      # UI, host-console, warm-up/live views, leaderboard
  components/admin/                # CMS-formulier-engine + veldschema's
  pages/                           # Landing, Join, Play, Master, Warmup, Admin
docs/superpowers/                  # spec + implementatieplan
```

## Scripts

```bash
npm run dev      # dev-server (mobile-first; gebruik de Network-URL op je telefoon)
npm run build    # type-check + productie-build
npm run preview  # serveer de productie-build lokaal
npm test         # unit-tests (mappers, scoring, warm-up-logica)
```
