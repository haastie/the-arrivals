# Ordering Phrasebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the food-map language module into a practical ordering aid — a conservative, ordering-focused essentials list across 6 languages (adds Mandarin) plus a data-driven check that the dish vocabulary covers the most-recommended dishes.

**Architecture:** Reshape the existing hardcoded `PHRASE_GROUPS` (Approach A) so all TTS/`dishPhrase`/UI plumbing is reused. Add a read-only `--dish-coverage` report to the scraper to mine the most-common dishes per language. Small Phrasebook copy tweak; small `classify()` tweak to point Chinese venues at Mandarin.

**Tech Stack:** React 19 + Vite + TypeScript, Vitest, Web Speech API (existing), Node `.mjs` scraper + `@supabase/supabase-js`.

---

## File Structure

- `src/data/jacksonHeightsMap.ts` — **modify** `PHRASE_GROUPS`: reshape each group's `phrases[]` into ordering essentials, add a `mandarin` group, curate `foods[]`. (Interfaces `PhraseGroup`/`Phrase` unchanged.)
- `src/data/jacksonHeightsMap.test.ts` — **create**: phrase-group well-formedness + `dishPhrase` matching.
- `src/components/foodmap/Phrasebook.tsx` — **modify**: rename the phrase section heading to "Bestellen" + tweak intro. (Mandarin tab appears automatically because the tab list maps over `PHRASE_GROUPS`.)
- `scripts/scrape-restaurants.mjs` — **modify**: add `--dish-coverage` report mode; in `classify()`, route Chinese/Cantonese to `lang_group: 'mandarin'`.

No new languages beyond Mandarin. No CMS. `speak.ts`/`RestaurantDetail.tsx` unchanged.

---

### Task 1: `--dish-coverage` report mode (scraper tooling)

Read-only report mined from Supabase: top recommended dishes per language + which are missing from the inline food-token map. No Yelp/Claude.

**Files:**
- Modify: `scripts/scrape-restaurants.mjs`

- [ ] **Step 1: Add the `--dish-coverage` flag and relax env requirements**

In the args/env block (after `const AUDIT = has('--audit')`), add:

```js
const DISH_COVERAGE = has('--dish-coverage') // alleen Supabase lezen + rapporteren
```

Then change the two env guards so dish-coverage only needs Supabase (not Yelp/Claude). Replace:

```js
if (!YELP_API_KEY) fail('Zet YELP_API_KEY in je env.')
if (!AUDIT && ENRICH && !ANTHROPIC_API_KEY) fail('Zet ANTHROPIC_API_KEY (of gebruik --no-enrich).')
if (!AUDIT && !DRY && (!SUPABASE_URL || !SERVICE_KEY)) fail('Zet SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (of gebruik --dry-run).')
```

with:

```js
if (!DISH_COVERAGE && !YELP_API_KEY) fail('Zet YELP_API_KEY in je env.')
if (!DISH_COVERAGE && !AUDIT && ENRICH && !ANTHROPIC_API_KEY) fail('Zet ANTHROPIC_API_KEY (of gebruik --no-enrich).')
if ((DISH_COVERAGE || (!AUDIT && !DRY)) && (!SUPABASE_URL || !SERVICE_KEY))
  fail('Zet SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.')
```

- [ ] **Step 2: Add the tokenizer, inline food-token map, and report function**

Insert just above the `// ---- main` section header:

```js
// ---- dekkingscheck gerechten -----------------------------------------------
// Welke gerechten uit restaurants.dish komen het vaakst voor per taal, en zitten
// die al in de taalgids (foods)? Klein, inline token-lijstje gespiegeld aan de
// foods[] in src/data/jacksonHeightsMap.ts (bewust kleine duplicatie).
const DISH_STOPWORDS = new Set([
  'met', 'van', 'de', 'het', 'een', 'en', 'of', 'op', 'bij', 'in', 'la', 'el', 'los', 'las',
  'con', 'del', 'the', 'and', 'style', 'set', 'weekend', 'graag',
])
function tokenizeDish(dish) {
  return (dish || '')
    .toLowerCase()
    .replace(/[^a-zà-ÿ\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !DISH_STOPWORDS.has(t))
}
const FOOD_TOKENS = {
  hindi: ['dosa', 'samosa', 'biryani', 'chaat', 'thali'],
  bengali: ['macher', 'jhol', 'ilish', 'mishti', 'biryani'],
  nepali: ['momo', 'thukpa', 'sel', 'roti', 'khana'],
  tibetan: ['momo', 'thukpa', 'tingmo'],
  spanish: ['arepa', 'bandeja', 'paisa', 'birria', 'taco', 'hornado', 'encebollado', 'empanada'],
  mandarin: ['jiaozi', 'dumpling', 'miantiao', 'noodle', 'chaofan', 'rice', 'dimsum', 'huoguo'],
}
async function dishCoverageReport() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await supabase.from('restaurants').select('lang_group, dish').eq('active', true)
  if (error) fail('Supabase: ' + error.message)
  const byLang = {}
  for (const r of data) {
    const lang = r.lang_group || '(geen gids)'
    byLang[lang] ??= {}
    for (const tok of tokenizeDish(r.dish)) byLang[lang][tok] = (byLang[lang][tok] || 0) + 1
  }
  console.log('\n========  DEKKING GERECHTEN (top per taal)  ========')
  for (const lang of Object.keys(byLang).sort()) {
    const covered = FOOD_TOKENS[lang] || []
    const top = Object.entries(byLang[lang]).sort((a, b) => b[1] - a[1]).slice(0, 15)
    console.log(`\n== ${lang} ==`)
    for (const [tok, n] of top) {
      const inFoods = covered.some((f) => f.includes(tok) || tok.includes(f))
      console.log(`  ${String(n).padStart(3)}×  ${tok}${inFoods ? '' : '   ← ontbreekt in foods'}`)
    }
  }
  console.log('\n====================================================')
}
```

- [ ] **Step 3: Branch into the report from `main()`**

In `main()`, immediately after `const tiles = buildTiles()` and the `LIST_TILES` block, add (before tile selection / discovery):

```js
  if (DISH_COVERAGE) {
    await dishCoverageReport()
    return
  }
```

- [ ] **Step 4: Document the flag in the header usage comment**

Under the `GEBRUIK` block add a line:

```
 *   node scripts/scrape-restaurants.mjs --dish-coverage # top gerechten per taal (alleen Supabase)
```

- [ ] **Step 5: Verify syntax**

Run: `node --check scripts/scrape-restaurants.mjs`
Expected: no output (exit 0).

- [ ] **Step 6: Commit**

```bash
git add scripts/scrape-restaurants.mjs
git commit -m "feat(scraper): --dish-coverage report (top dishes per language)"
```

---

### Task 2: Reshape `PHRASE_GROUPS` — ordering essentials + Mandarin + foods

**Files:**
- Create: `src/data/jacksonHeightsMap.test.ts`
- Modify: `src/data/jacksonHeightsMap.ts` (the `PHRASE_GROUPS` array, ~lines 107–183)

- [ ] **Step 1: Write the failing test**

Create `src/data/jacksonHeightsMap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PHRASE_GROUPS, phraseGroupById, dishPhrase, type Restaurant } from './jacksonHeightsMap'

describe('PHRASE_GROUPS', () => {
  it('elke groep en elke zin/gerecht is goed gevormd', () => {
    for (const g of PHRASE_GROUPS) {
      expect(g.id).toBeTruthy()
      expect(g.ttsLang).toBeTruthy()
      expect(typeof g.roman).toBe('boolean')
      expect(g.phrases.length).toBeGreaterThan(0)
      for (const p of [...g.phrases, ...g.foods]) {
        expect(p.en).toBeTruthy()
        expect(p.native).toBeTruthy()
        expect(p.roman).toBeTruthy()
      }
    }
  })

  it('bevat een Mandarijn-groep met zh-CN stem', () => {
    expect(phraseGroupById['mandarin']).toBeTruthy()
    expect(phraseGroupById['mandarin'].ttsLang).toBe('zh-CN')
  })
})

describe('dishPhrase', () => {
  const base: Restaurant = {
    id: 'x', name: 'X', communityId: 'south_asian', cuisine: '', price: '', address: '',
    x: 0, y: 0, langGroup: 'hindi', tour: 0, rating: 0, ratingCount: 0, ratingSource: '',
    consensus: '', dish: 'Chicken biryani', dishSource: '', quotes: [],
  }
  it('koppelt het gerecht aan een foods-item van de taalgroep', () => {
    const dp = dishPhrase(base)
    expect(dp?.food.roman.toLowerCase()).toContain('biryani')
  })
  it('geeft null als de zaak geen taalgroep heeft', () => {
    expect(dishPhrase({ ...base, langGroup: null })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/jacksonHeightsMap.test.ts`
Expected: FAIL — `phraseGroupById['mandarin']` is undefined (no Mandarin group yet).

- [ ] **Step 3: Replace the `PHRASE_GROUPS` array**

In `src/data/jacksonHeightsMap.ts`, replace the entire `export const PHRASE_GROUPS: PhraseGroup[] = [ ... ]` literal with:

```ts
export const PHRASE_GROUPS: PhraseGroup[] = [
  {
    id: 'hindi', tab: 'नमस्ते', label: 'Hindi / Urdu', flag: 'Gesproken in de Zuid-Aziatische kern', ttsLang: 'hi-IN', roman: false,
    phrases: [
      { en: 'Hallo', native: 'नमस्ते', roman: 'Namaste' },
      { en: 'Dank je', native: 'शुक्रिया', roman: 'Shukriya' },
      { en: 'Dit graag', native: 'यह दीजिए', roman: 'Yah dījiye' },
      { en: 'Eén hiervan', native: 'एक यह', roman: 'Ek yah' },
      { en: 'Hoeveel kost het?', native: 'कितने का है?', roman: 'Kitne kā hai?' },
      { en: 'Niet te pittig', native: 'ज़्यादा तीखा नहीं', roman: 'Zyādā tīkhā nahīn' },
      { en: 'Heerlijk!', native: 'बहुत स्वादिष्ट', roman: 'Bahut swādisht' },
      { en: 'De rekening, graag', native: 'बिल दीजिए', roman: 'Bil dījiye' },
    ],
    foods: [
      { en: 'Linzenpannenkoek', native: 'दोसा', roman: 'Dosa' },
      { en: 'Gefrituurd deeg', native: 'समोसा', roman: 'Samosa' },
      { en: 'Gekruide rijst', native: 'बिरयानी', roman: 'Biryani' },
      { en: 'Straatsnacks', native: 'चाट', roman: 'Chaat' },
      { en: 'Schotel', native: 'थाली', roman: 'Thali' },
    ],
  },
  {
    id: 'bengali', tab: 'বাংলা', label: 'Bengaals', flag: 'Little Bangladesh, 73rd–74th St', ttsLang: 'bn-IN', roman: false,
    phrases: [
      { en: 'Hallo', native: 'নমস্কার', roman: 'Nomoshkar' },
      { en: 'Dank je', native: 'ধন্যবাদ', roman: 'Dhonnobad' },
      { en: 'Dit graag', native: 'এটা দিন', roman: 'Eta din' },
      { en: 'Hoeveel kost het?', native: 'কত দাম?', roman: 'Koto dam?' },
      { en: 'Niet te pittig', native: 'বেশি ঝাল না', roman: 'Beshi jhal na' },
      { en: 'Heerlijk!', native: 'খুব মজা', roman: 'Khub moja' },
      { en: 'De rekening, graag', native: 'বিল দিন', roman: 'Bil din' },
    ],
    foods: [
      { en: 'Vis in saus', native: 'মাছের ঝোল', roman: 'Macher jhol' },
      { en: 'Hilsa-vis', native: 'ইলিশ', roman: 'Ilish' },
      { en: 'Zoetigheid', native: 'মিষ্টি', roman: 'Mishti' },
      { en: 'Gekruide rijst', native: 'বিরিয়ানি', roman: 'Biryani' },
    ],
  },
  {
    id: 'nepali', tab: 'नेपाली', label: 'Nepalees', flag: 'Himalaya-keukens & winkels', ttsLang: 'hi-IN', roman: false,
    phrases: [
      { en: 'Hallo', native: 'नमस्ते', roman: 'Namaste' },
      { en: 'Dank je', native: 'धन्यवाद', roman: 'Dhanyabaad' },
      { en: 'Dit graag', native: 'यो दिनुस्', roman: 'Yo dinus' },
      { en: 'Hoeveel kost het?', native: 'कति हो?', roman: 'Kati ho?' },
      { en: 'Niet te pittig', native: 'पिरो कम', roman: 'Piro kam' },
      { en: 'Heerlijk!', native: 'मिठो छ', roman: 'Mitho cha' },
      { en: 'De rekening, graag', native: 'बिल दिनुस्', roman: 'Bil dinus' },
    ],
    foods: [
      { en: 'Dumplings', native: 'मम', roman: 'Momo' },
      { en: 'Noedelsoep', native: 'थुक्पा', roman: 'Thukpa' },
      { en: 'Gefrituurde rijstring', native: 'सेलरोटी', roman: 'Sel roti' },
      { en: 'Setmaaltijd', native: 'खाना सेट', roman: 'Khana set' },
    ],
  },
  {
    id: 'tibetan', tab: 'བོད་སྐད', label: 'Tibetaans', flag: 'Momo-balies bij 74th St', ttsLang: 'en-US', roman: true,
    phrases: [
      { en: 'Hallo', native: 'བཀྲ་ཤིས་བདེ་ལེགས།', roman: 'Tashi delek' },
      { en: 'Dank je', native: 'ཐུགས་རྗེ་ཆེ།', roman: 'Thuk je che' },
      { en: 'Heerlijk', native: 'ཞིམ་པོ་འདུག', roman: 'Zhimpo duk' },
    ],
    foods: [
      { en: 'Dumplings', native: 'མོག་མོག', roman: 'Momo' },
      { en: 'Gestoomd brood', native: 'ཏིང་མོ', roman: 'Tingmo' },
      { en: 'Noedelsoep', native: 'ཐུག་པ', roman: 'Thukpa' },
    ],
  },
  {
    id: 'spanish', tab: '¡Hola!', label: 'Spaans', flag: 'Colombiaans · Mexicaans · Ecuadoriaans', ttsLang: 'es-MX', roman: false,
    phrases: [
      { en: 'Hallo!', native: '¡Hola!', roman: 'OH-lah' },
      { en: 'Dank je', native: 'Gracias', roman: 'GRAH-syas' },
      { en: 'Dit graag', native: 'Esto, por favor', roman: 'ES-toh por fah-VOR' },
      { en: 'Eén hiervan', native: 'Uno de estos', roman: 'OO-noh deh ES-tohs' },
      { en: 'Hoeveel kost het?', native: '¿Cuánto cuesta?', roman: 'KWAN-toh KWES-tah' },
      { en: 'Niet te pittig', native: 'No muy picante', roman: 'noh moy pee-KAN-teh' },
      { en: 'Om mee te nemen', native: 'Para llevar', roman: 'PAH-rah yeh-VAR' },
      { en: 'Heerlijk!', native: '¡Qué rico!', roman: 'keh REE-koh' },
      { en: 'De rekening, graag', native: 'La cuenta, por favor', roman: 'lah KWEN-tah' },
    ],
    foods: [
      { en: 'Maïskoek', native: 'Arepa', roman: 'ah-REH-pah' },
      { en: 'Paisa-schotel', native: 'Bandeja paisa', roman: 'ban-DEH-hah' },
      { en: 'Gedompelde taco’s', native: 'Birria', roman: 'BEE-ryah' },
      { en: 'Varkensbraad', native: 'Hornado', roman: 'or-NAH-doh' },
      { en: 'Vissoep', native: 'Encebollado', roman: 'en-seh-bo-YAH-doh' },
    ],
  },
  {
    id: 'mandarin', tab: '你好', label: 'Mandarijn', flag: 'Grootste Oost-Aziatische keuken', ttsLang: 'zh-CN', roman: false,
    phrases: [
      { en: 'Hallo', native: '你好', roman: 'Nǐ hǎo' },
      { en: 'Dank je', native: '谢谢', roman: 'Xièxie' },
      { en: 'Dit graag', native: '我要这个', roman: 'Wǒ yào zhège' },
      { en: 'Eén hiervan', native: '来一个', roman: 'Lái yīgè' },
      { en: 'Hoeveel kost het?', native: '多少钱?', roman: 'Duōshǎo qián?' },
      { en: 'Niet te pittig', native: '不要太辣', roman: 'Bùyào tài là' },
      { en: 'Om mee te nemen', native: '打包', roman: 'Dǎbāo' },
      { en: 'Heerlijk!', native: '很好吃', roman: 'Hěn hǎochī' },
      { en: 'De rekening, graag', native: '买单', roman: 'Mǎidān' },
    ],
    foods: [
      { en: 'Dumplings', native: '饺子', roman: 'Jiǎozi' },
      { en: 'Noedels', native: '面条', roman: 'Miàntiáo' },
      { en: 'Gebakken rijst', native: '炒饭', roman: 'Chǎofàn' },
      { en: 'Dim sum', native: '点心', roman: 'Diǎnxīn' },
      { en: 'Hotpot', native: '火锅', roman: 'Huǒguō' },
    ],
  },
]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/jacksonHeightsMap.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full build**

Run: `npm run build`
Expected: `tsc -b` clean, `vite build` succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/data/jacksonHeightsMap.ts src/data/jacksonHeightsMap.test.ts
git commit -m "feat(foodmap): ordering-focused phrases + Mandarin group; phrasebook tests"
```

---

### Task 3: Phrasebook UI — "Bestellen" heading + intro

The tabs already map over `PHRASE_GROUPS`, so the Mandarin tab appears automatically. Only the phrase-section heading and intro copy change.

**Files:**
- Modify: `src/components/foodmap/Phrasebook.tsx`

- [ ] **Step 1: Update the intro copy**

Replace the intro paragraph:

```tsx
        <p className="mt-1 text-sm text-ink/60">
          Zinnen en gerechten in de talen van Roosevelt Ave. Tik op de luidspreker om ze te horen, of
          open een pin voor de eigen zin van een zaak.
        </p>
```

with:

```tsx
        <p className="mt-1 text-sm text-ink/60">
          Bestel in de talen van Roosevelt Ave. Tik op de luidspreker om een zin te horen, of open een
          pin voor de eigen zin van een zaak.
        </p>
```

- [ ] **Step 2: Rename the phrase section heading**

Replace:

```tsx
          <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-ink/45 uppercase">Zinnen</p>
```

with:

```tsx
          <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-ink/45 uppercase">Bestellen</p>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/foodmap/Phrasebook.tsx
git commit -m "feat(foodmap): phrasebook reads as an ordering guide (Bestellen)"
```

---

### Task 4: Route Chinese venues to Mandarin (+ SQL for existing rows)

**Files:**
- Modify: `scripts/scrape-restaurants.mjs` (`classify()`, the `east_asian` branch)

- [ ] **Step 1: Give Chinese/Cantonese venues the Mandarin language**

In `classify()`, replace the East Asian branch:

```js
  if (hit('chinese', 'thai', 'japanese', 'korean', 'filipino', 'vietnam', 'malaysian', 'burmese',
          'indonesian', 'asianfusion', 'sushi', 'ramen', 'hotpot', 'cantonese', 'szechuan', 'dimsum',
          'taiwanese', 'noodles', 'izakaya'))
    return { community: 'east_asian', lang: null }
```

with:

```js
  if (hit('chinese', 'thai', 'japanese', 'korean', 'filipino', 'vietnam', 'malaysian', 'burmese',
          'indonesian', 'asianfusion', 'sushi', 'ramen', 'hotpot', 'cantonese', 'szechuan', 'dimsum',
          'taiwanese', 'noodles', 'izakaya')) {
    // Chinese zaken krijgen de Mandarijn-taalgids; overige Oost-Aziatische niet.
    const lang = hit('chinese', 'cantonese', 'szechuan', 'dimsum', 'hotpot', 'taiwanese') ? 'mandarin' : null
    return { community: 'east_asian', lang }
  }
```

- [ ] **Step 2: Verify syntax**

Run: `node --check scripts/scrape-restaurants.mjs`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add scripts/scrape-restaurants.mjs
git commit -m "feat(scraper): point Chinese venues at the Mandarin phrasebook"
```

- [ ] **Step 4: Record the data-fix SQL for already-scraped rows (no code change)**

The user has already scraped, so existing Chinese rows have `lang_group = null`. To light up the Mandarin snippet on those restaurant cards without a full re-scrape, run this in the Supabase SQL Editor (heuristic on cuisine text):

```sql
update restaurants
set lang_group = 'mandarin'
where community_id = 'east_asian'
  and lang_group is null
  and (cuisine ilike '%chinese%' or cuisine ilike '%cantonese%' or cuisine ilike '%szechuan%'
       or cuisine ilike '%dim sum%' or cuisine ilike '%hot pot%' or cuisine ilike '%taiwanese%');
```

(Alternatively, a re-scrape applies it automatically. The Mandarin **tab** in the phrasebook works regardless.)

---

## Notes for the implementer

- **Run order:** Tasks 1–4 are independent and can be done in any order, but commit each separately.
- **Final check after all tasks:** `npm run build && npx vitest run` — expect a clean `tsc -b`, successful `vite build`, and all tests green (the suite was 16 tests + the 4 new ones = 20).
- **Curating `foods[]` from real data (post-merge):** the user runs `node scripts/scrape-restaurants.mjs --dish-coverage`. For any dish flagged `← ontbreekt in foods` that appears frequently and is confidently renderable, add it to the matching group's `foods[]` in `src/data/jacksonHeightsMap.ts` (and mirror its token into `FOOD_TOKENS` in the scraper). Keep it conservative — skip anything you can't render in native + romanization.
- **Do not** touch `speak.ts` (pronunciation kept as-is per the spec) or `RestaurantDetail.tsx`.
