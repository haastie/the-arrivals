-- =============================================================================
-- The Arrivals - 0011: restaurant-type (kind).
-- Onderscheidt eetgelegenheden van winkels/supermarkten en nachtleven, zodat de
-- scraper niet-restaurants op non-actief kan zetten. Draai in de Supabase SQL
-- Editor vóór een nieuwe scrape-run. Idempotent.
-- =============================================================================

alter table restaurants
  add column if not exists kind text not null default 'restaurant'; -- 'restaurant' | 'nightlife' | 'grocery'

-- De admin-RPC en seed laten kind ongemoeid: nieuwe rijen krijgen de default,
-- de scraper schrijft kind rechtstreeks via de service-role upsert.
