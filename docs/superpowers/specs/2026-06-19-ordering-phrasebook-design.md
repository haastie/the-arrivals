# Ordering Phrasebook — Design

**Goal:** Turn the food-map language module from a passive reference into a practical *ordering* aid: a richer, ordering-focused essentials list per language, plus a data-driven check that the dish vocabulary covers the dishes people will actually want to order.

**Date:** 2026-06-19

---

## Context

The language module today (`src/data/jacksonHeightsMap.ts` → `PHRASE_GROUPS`, rendered by `src/components/foodmap/Phrasebook.tsx`, with per-restaurant snippets in `RestaurantDetail.tsx`):

- 5 languages: Hindi/Urdu, Bengali, Nepali, Tibetan, Spanish.
- Each group has `phrases[]` (≈4–5 generic greetings) + `foods[]` (≈4 dish words), plus `ttsLang` and a `roman` flag (speak romanized vs native).
- TTS via Web Speech (`src/lib/speak.ts`, `SpeakButton.tsx`).
- `dishPhrase()` matches a restaurant's recommended `dish` to a `foods[]` entry; `restaurantPhrase()` returns the language group + a greeting.

It reads as a reference list, not an ordering tool. Restaurants live in Supabase (scraped); the `restaurants.dish` field already holds each venue's recommended dish (Claude-generated).

## Decisions (from brainstorming)

- **Approach A** — reshape the existing `PHRASE_GROUPS` in place; reuse all TTS/`dishPhrase`/UI plumbing. No CMS (content stays hardcoded).
- **Format** — one flat **essentials list** (~10 phrases) per language, sequenced greeting → order → preferences → pay.
- **Languages** — the 5 existing + **Mandarin Chinese** (6 total).
- **Accuracy** — **conservative**: include only short, well-established phrases that can be confidently rendered in native script + romanization; skip anything risky. Per-language counts may vary.
- **`foods[]`** — curated from the **most-common recommended dishes** mined from the live data (see the check), not hand-guessed.

## Architecture / Components

1. **`PHRASE_GROUPS` data** (`src/data/jacksonHeightsMap.ts`) — reshaped content; new Mandarin group. Same TypeScript shape (`PhraseGroup`, `Phrase`).
2. **Dish-coverage check** (`scripts/scrape-restaurants.mjs`, new `--dish-coverage` mode) — read-only report mined from Supabase; informs `foods[]` curation.
3. **Phrasebook UI** (`Phrasebook.tsx`) — copy tweaks + Mandarin tab; otherwise unchanged.
4. **Scraper classification** (`classify()` in `scrape-restaurants.mjs`) — Chinese/Cantonese venues get `lang_group: 'mandarin'`.
5. **Tests** (`src/data/*.test.ts` or similar) — phrase-group well-formedness + `dishPhrase` matching.

Each unit is independent: the data change ships static content; the check is a standalone Node script; the UI change is presentational; the scraper tweak only affects future/updated rows.

## Data model

`PhraseGroup` and `Phrase` interfaces are unchanged. For each group:

- **`phrases[]` becomes the ordering essentials**, flat and sequenced. Target set (subset per language by what renders confidently):
  *Hello (greeting) · I'd like this · One/two of these · Not (too) spicy · No meat / vegetarian · How much? · To take away · Delicious · The bill, please · Thank you.*
  Item 1 stays a **greeting** so `restaurantPhrase()` (which returns `phrases[0]`) keeps surfacing a greeting on the restaurant card.
- **New group: Mandarin** — `id: 'mandarin'`, `ttsLang: 'zh-CN'`, `roman: false` (speak Hanzi), `native` = Hanzi, `roman` = pinyin. Tab label/flag consistent with the others.
- **`foods[]`** — curated from the dish-coverage report (top dishes per language), conservative rendering only.

Content remains hardcoded in the TS module; no Supabase table for phrases.

## The "most-common dishes" check

New mode on the existing scraper: `node scripts/scrape-restaurants.mjs --dish-coverage`. Supabase only (no Yelp/Claude); reuses the script's `.env.local` loading + service-role client.

1. Read active `restaurants` from Supabase.
2. Group by `lang_group`. The 6 phrase languages are reported individually; rows with `lang_group = null` (or languages without a guide, e.g. Thai/Japanese) are reported as **"no guide"** so coverage gaps are visible.
3. **Tokenize** each `dish` string: lowercase, strip punctuation, split on whitespace, drop stopwords (Dutch/Spanish glue words and noise: *met, van, de, het, en, &, +, weekend,* etc.).
4. Tally token frequency per language; print the **top dishes per language**, and **flag tokens not covered** by that language's `foods[]`.

To stay standalone (a `.mjs` cannot import the TS module cleanly), the script keeps a small inline map of each language's known food tokens, kept in sync with `foods[]`. This is intentional, minimal duplication; the alternative (cross-importing TS into `.mjs`) is fragile.

**Workflow:** the user runs `--dish-coverage` and shares the output; the food vocabulary is curated to cover the top hits (conservatively). Re-runnable any time the data changes.

## UI surfacing

- **`Phrasebook.tsx`** — rename the "Zinnen" section heading to **"Bestellen"**; keep "Op het menu" (now data-curated); add the Mandarin tab. Each line keeps its `SpeakButton`. No structural redesign. Reached via the existing "📖 Taalgids" sheet on the map.
- **`RestaurantDetail.tsx`** — unchanged: greeting + recommended dish with audio.

## Chinese → Mandarin wiring

`classify()` gains: Chinese/Cantonese aliases/names → `lang_group: 'mandarin'` (other East Asian cuisines stay `null`).

**Already-scraped note:** existing Chinese rows have `lang_group = null`. To light up the Mandarin snippet on those cards, either re-run the scraper or apply a one-line SQL update (provided in the implementation plan). The standalone Mandarin tab in the Phrasebook works immediately regardless, since its content is static.

## Error handling

- TTS degrades gracefully: unsupported speech or a missing `zh-CN` voice → silent no-op (existing behavior in `speak.ts`).
- Conservative content guarantees no empty/garbled entries.
- Restaurants with no language group already render no language block (handled earlier this session).

## Testing

- A light vitest asserting every `PhraseGroup` is well-formed: non-empty `phrases`, each `Phrase` has `en`/`native`/`roman`, a valid non-empty `ttsLang`, and that the `mandarin` group exists.
- A unit test for `dishPhrase()` matching a known dish to a `foods[]` entry.
- Build verified with `npm run build` (`tsc -b && vite build`).

## What the user runs

1. **`node scripts/scrape-restaurants.mjs --dish-coverage`** (once the script exists) → share output so `foods[]` is curated from real data. Free, read-only.
2. **One small SQL update** (provided in the plan) *or* a re-scrape → set `lang_group = 'mandarin'` on existing Chinese rows so the Mandarin snippet shows on their cards. Optional; only affects the per-restaurant snippet, not the Phrasebook.
3. Nothing else — the phrasebook content ships static in the build.

## Out of scope (YAGNI)

- No order-builder, point-to-show card mode, or live translation.
- No CMS/Supabase table for phrases.
- No new languages beyond Mandarin (Thai/Japanese/etc. remain without a guide).
- No redesign of the restaurant detail card.
