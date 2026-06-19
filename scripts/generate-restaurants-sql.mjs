// Genereert supabase/migrations/0008_restaurants.sql:
//   - tabel `restaurants` (publiek leesbaar, admin-bewerkbaar)
//   - RLS-policy + grants + admin_upsert_restaurant / admin_delete_restaurant
//   - seed met de 18 startrestaurants (uit src/data/jacksonHeightsMap.ts)
// Daarna leest de app de restaurants live uit de DB; toevoegen/bewerken kan via
// /admin zonder redeploy. Idempotent: upsert op id.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const out = join(root, 'supabase', 'migrations', '0008_restaurants.sql')

// RESTAURANTS-array uit de TS-databron halen en evalueren.
const dataSrc = readFileSync(join(root, 'src', 'data', 'jacksonHeightsMap.ts'), 'utf8')
const m = dataSrc.match(/RESTAURANTS: Restaurant\[\] = (\[[\s\S]*?\])\n\nexport const PHRASE_GROUPS/)
if (!m) throw new Error('Kon RESTAURANTS-array niet vinden')
const RESTAURANTS = eval(m[1])

const dash = (v) => (typeof v === 'string' ? v.replace(/[—–]/g, '-') : v)
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(dash(v)).replace(/'/g, "''")}'`)
const n = (v) => (v === null || v === undefined ? 'null' : Number(v))
const b = (v) => (v ? 'true' : 'false')
const jsonb = (v) => `'${JSON.stringify(v ?? []).replace(/'/g, "''")}'::jsonb`

const header = `-- =============================================================================
-- The Arrivals - 0008: restaurants (live eten- & taalkaart).
-- Publiek leesbaar; bewerken via /admin (admin_secret). Draai in de Supabase
-- SQL Editor. Idempotent.
-- =============================================================================

create table if not exists restaurants (
  id text primary key,
  name text not null,
  community_id text not null,        -- verwijst naar COMMUNITIES (code)
  cuisine text,
  price text,
  address text,
  x numeric not null default 50,     -- kaartpositie 0-100
  y numeric not null default 50,
  lang_group text,                   -- verwijst naar PHRASE_GROUPS (code)
  tour int,
  rating numeric,
  rating_count int,
  rating_source text,
  consensus text,
  dish text,
  dish_source text,
  quotes jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  active boolean not null default true
);

alter table restaurants enable row level security;
drop policy if exists "read restaurants" on restaurants;
create policy "read restaurants" on restaurants for select using (true);
grant select on restaurants to anon, authenticated;

create or replace function admin_upsert_restaurant(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  insert into restaurants (id, name, community_id, cuisine, price, address, x, y, lang_group,
    tour, rating, rating_count, rating_source, consensus, dish, dish_source, quotes, sort_order, active)
  values (
    coalesce(nullif(p_row->>'id',''),'r-'||substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    p_row->>'name', p_row->>'community_id', p_row->>'cuisine', p_row->>'price', p_row->>'address',
    coalesce(nullif(p_row->>'x','')::numeric, 50), coalesce(nullif(p_row->>'y','')::numeric, 50),
    p_row->>'lang_group', nullif(p_row->>'tour','')::int,
    nullif(p_row->>'rating','')::numeric, nullif(p_row->>'rating_count','')::int, p_row->>'rating_source',
    p_row->>'consensus', p_row->>'dish', p_row->>'dish_source',
    coalesce(p_row->'quotes','[]'::jsonb),
    coalesce(nullif(p_row->>'sort_order','')::int, 0),
    coalesce((p_row->>'active')::boolean, true))
  on conflict (id) do update set
    name=excluded.name, community_id=excluded.community_id, cuisine=excluded.cuisine,
    price=excluded.price, address=excluded.address, x=excluded.x, y=excluded.y,
    lang_group=excluded.lang_group, tour=excluded.tour, rating=excluded.rating,
    rating_count=excluded.rating_count, rating_source=excluded.rating_source,
    consensus=excluded.consensus, dish=excluded.dish, dish_source=excluded.dish_source,
    quotes=excluded.quotes, sort_order=excluded.sort_order, active=excluded.active;
end;
$$;

create or replace function admin_delete_restaurant(p_secret text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin perform assert_admin(p_secret); delete from restaurants where id = p_id; end;
$$;

grant execute on function
  admin_upsert_restaurant(text, jsonb), admin_delete_restaurant(text, text)
to anon, authenticated;

-- Seed: de 18 startrestaurants
`

const rows = RESTAURANTS.map((r) => {
  const cols = [
    q(r.id), q(r.name), q(r.communityId), q(r.cuisine), q(r.price), q(r.address),
    n(r.x), n(r.y), q(r.langGroup), n(r.tour), n(r.rating), n(r.ratingCount), q(r.ratingSource),
    q(r.consensus), q(r.dish), q(r.dishSource), jsonb(r.quotes), n(r.tour), 'true',
  ]
  return `insert into restaurants (id, name, community_id, cuisine, price, address, x, y, lang_group, tour, rating, rating_count, rating_source, consensus, dish, dish_source, quotes, sort_order, active) values (${cols.join(
    ', ',
  )})\n  on conflict (id) do update set name=excluded.name, community_id=excluded.community_id, cuisine=excluded.cuisine, price=excluded.price, address=excluded.address, x=excluded.x, y=excluded.y, lang_group=excluded.lang_group, tour=excluded.tour, rating=excluded.rating, rating_count=excluded.rating_count, rating_source=excluded.rating_source, consensus=excluded.consensus, dish=excluded.dish, dish_source=excluded.dish_source, quotes=excluded.quotes, sort_order=excluded.sort_order, active=excluded.active;`
})

writeFileSync(out, header + rows.join('\n') + '\n')
console.log(`Wrote ${out} with ${RESTAURANTS.length} restaurants`)
