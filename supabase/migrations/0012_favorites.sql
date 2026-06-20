-- =============================================================================
-- The Arrivals - 0012: gedeelde favorieten (eten- & taalkaart).
-- Deelnemers (anoniem, per toestel) markeren restaurants als favoriet; de groep
-- ziet de gezamenlijke shortlist met tellingen. Draai in de Supabase SQL Editor.
-- Idempotent.
-- =============================================================================

create table if not exists favorites (
  restaurant_id text not null,
  device_id text not null,           -- anonieme toestel-UUID (localStorage)
  created_at timestamptz not null default now(),
  primary key (restaurant_id, device_id)  -- één hartje per toestel per zaak
);

alter table favorites enable row level security;
drop policy if exists "read favorites" on favorites;
create policy "read favorites" on favorites for select using (true);
grant select on favorites to anon, authenticated;

-- Schrijven via RPC (zoals de admin-functies): zet of verwijder het hartje van
-- dit toestel. Geen account nodig; de PK voorkomt dubbeltellen.
create or replace function favorite_set(p_restaurant_id text, p_device_id text, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_on, false) then
    insert into favorites (restaurant_id, device_id)
    values (p_restaurant_id, p_device_id)
    on conflict (restaurant_id, device_id) do nothing;
  else
    delete from favorites where restaurant_id = p_restaurant_id and device_id = p_device_id;
  end if;
end;
$$;

grant execute on function favorite_set(text, text, boolean) to anon, authenticated;
