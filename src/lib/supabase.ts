import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True wanneer de env-vars ontbreken — de UI toont dan een nette uitleg i.p.v. te crashen. */
export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  // Geen harde crash: /master en /play tonen een setup-melding.
  console.warn(
    '[The Arrivals] Supabase env ontbreekt. Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in .env.local (zie README).',
  )
}

// Anonieme client; deelnemers hebben geen account. Realtime staat aan.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key', {
  realtime: { params: { eventsPerSecond: 10 } },
})
