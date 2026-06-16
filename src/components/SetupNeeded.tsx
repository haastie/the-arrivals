import { Card, Screen } from './ui'

/** Getoond wanneer de Supabase-env ontbreekt, i.p.v. een witte crash. */
export function SetupNeeded() {
  return (
    <Screen className="justify-center">
      <Card>
        <h1 className="font-display text-xl font-bold">Backend nog niet verbonden</h1>
        <p className="mt-2 text-sm text-ink/70">
          De Supabase-omgevingsvariabelen ontbreken. Zet ze in <code>.env.local</code> (lokaal) of in
          je Vercel-projectinstellingen:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-ink p-3 text-xs text-paper">
{`VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...`}
        </pre>
        <p className="mt-3 text-sm text-ink/70">
          Daarna de SQL-migratie draaien (<code>supabase/migrations/0001_init.sql</code>). Zie de
          README voor de stappen.
        </p>
      </Card>
    </Screen>
  )
}
