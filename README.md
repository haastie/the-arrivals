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
| `/`        | Landing: intro + "Doe mee" en (klein) "Host".                        |
| `/join`    | Naam + 6-teken sessiecode (of via QR-deeplink `/join?code=XXXX`).    |
| `/play`    | Deelnemersapp (warm-up of live, afhankelijk van de sessiefase).      |
| `/master`  | Host-control. Sessie + `host_secret` zitten in de URL (`?s=&secret=`).|

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
2. **SQL Editor** → plak de inhoud van [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) → **Run**.
   Dit maakt de tabellen, RLS-policies, RPC-functies en realtime-publicatie aan. De migratie is
   idempotent — opnieuw draaien is veilig.
3. **Project Settings → API** → kopieer de **`anon` public key**.

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

## Vragen aanvullen (host, komende dagen)

Alle vragen staan in `content_seed.json`. Een nieuwe vraag toevoegen:

1. Voeg een object toe aan `stops[].questions` (of `warmup.questions`):
   - **`mc`** → `options[]` + `correctIndex` → automatisch gescoord.
   - **`open`** → `modelAnswer` (rubric voor de host) → host beoordeelt ✓/✗.
   - Zet `"isTimeline": true` om mee te tellen voor de Tijdlijn-kern.
2. Geef een **uniek `id`** (bv. `s4-q4`).
3. Commit + push → Vercel her-deployt automatisch. De seed zit in de bundle, dus na deploy
   staat de vraag live; geen database-migratie nodig.

> De host hoeft de DB niet aan te raken om content te wijzigen — alleen de seed + redeploy.

---

## Security (bewust licht)

Dit is een privé spel voor een kleine groep; de beveiliging is **bewust licht maar netjes**
ingericht en hier gedocumenteerd:

- **RLS staat aan** op alle tabellen. De anon-rol mag alleen **lezen** (voor realtime); de
  kolom `host_secret` wordt **nooit** aan anon gegeven (column-level grant), ook niet in
  realtime-payloads.
- **Alle schrijfacties lopen via `SECURITY DEFINER`-RPC's** (zie de migratie). Host-acties
  (fase wisselen, vraag pushen, onthullen/scoren, punten bijstellen) verifiëren het
  **`host_secret`**. Wie het secret niet heeft, kan niet besturen.
- **Warm-up-scoring** gebeurt client-side (de client levert correctheid + punten aan de RPC).
  Een deelnemer zou hier theoretisch kunnen "valsspelen"; voor een vriendengroep is dat
  acceptabel. De **scorende kern** (live tour) wordt server-gestuurd onthuld door de host.
- De host-link bevat het `host_secret` in de query — **deel die link niet**.

## Aannames (uit de handoff)

- Connectiviteit op straat is redelijk; warm-up content is gebundeld (offline leesbaar),
  live-modus vereist verbinding. De app herstelt automatisch na een korte verbindingsval
  (volledige refetch bij her-verbinden, online-worden of terug-focussen).
- Eén host (Jelle), via geheime link met `host_secret`.
- Geen accounts/wachtwoorden voor deelnemers — alleen een weergavenaam per sessie.
- Eén actieve sessie tegelijk volstaat, maar het model staat er meerdere toe.

## Projectstructuur

```
content_seed.json              # bron van waarheid (content)
supabase/migrations/0001_init.sql  # schema + RLS + RPC's + realtime
src/
  content/                     # typed loader voor de seed
  lib/                         # supabase client, RPC-API, identity, scoring
  hooks/useGameState.ts        # realtime bron-van-waarheid + reconnect
  components/                  # UI, host-console, warm-up/live views, leaderboard
  pages/                       # Landing, Join, Play, Master
```

## Scripts

```bash
npm run dev      # dev-server (mobile-first; gebruik de Network-URL op je telefoon)
npm run build    # type-check + productie-build
npm run preview  # serveer de productie-build lokaal
```
