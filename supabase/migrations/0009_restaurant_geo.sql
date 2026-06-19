-- =============================================================================
-- The Arrivals - 0009: echte coördinaten + scrape-velden voor restaurants.
-- Nodig voor de Leaflet-kaart en de Yelp-scraper. Draai in de Supabase SQL
-- Editor. Idempotent.
-- =============================================================================

alter table restaurants add column if not exists lat numeric;
alter table restaurants add column if not exists lng numeric;
alter table restaurants add column if not exists yelp_id text;
alter table restaurants add column if not exists source text not null default 'manual';
alter table restaurants add column if not exists photo_url text;

create unique index if not exists restaurants_yelp_id_key on restaurants (yelp_id) where yelp_id is not null;

-- Admin-RPC uitbreiden met lat/lng/yelp_id/source/photo_url
create or replace function admin_upsert_restaurant(p_secret text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin(p_secret);
  insert into restaurants (id, name, community_id, cuisine, price, address, x, y, lat, lng, lang_group,
    tour, rating, rating_count, rating_source, consensus, dish, dish_source, quotes, yelp_id, source,
    photo_url, sort_order, active)
  values (
    coalesce(nullif(p_row->>'id',''),'r-'||substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    p_row->>'name', p_row->>'community_id', p_row->>'cuisine', p_row->>'price', p_row->>'address',
    coalesce(nullif(p_row->>'x','')::numeric, 50), coalesce(nullif(p_row->>'y','')::numeric, 50),
    nullif(p_row->>'lat','')::numeric, nullif(p_row->>'lng','')::numeric,
    p_row->>'lang_group', nullif(p_row->>'tour','')::int,
    nullif(p_row->>'rating','')::numeric, nullif(p_row->>'rating_count','')::int, p_row->>'rating_source',
    p_row->>'consensus', p_row->>'dish', p_row->>'dish_source',
    coalesce(p_row->'quotes','[]'::jsonb), p_row->>'yelp_id',
    coalesce(nullif(p_row->>'source',''),'manual'), p_row->>'photo_url',
    coalesce(nullif(p_row->>'sort_order','')::int, 0),
    coalesce((p_row->>'active')::boolean, true))
  on conflict (id) do update set
    name=excluded.name, community_id=excluded.community_id, cuisine=excluded.cuisine,
    price=excluded.price, address=excluded.address, x=excluded.x, y=excluded.y,
    lat=excluded.lat, lng=excluded.lng, lang_group=excluded.lang_group, tour=excluded.tour,
    rating=excluded.rating, rating_count=excluded.rating_count, rating_source=excluded.rating_source,
    consensus=excluded.consensus, dish=excluded.dish, dish_source=excluded.dish_source,
    quotes=excluded.quotes, yelp_id=excluded.yelp_id, source=excluded.source,
    photo_url=excluded.photo_url, sort_order=excluded.sort_order, active=excluded.active;
end;
$$;
