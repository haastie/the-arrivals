import { Link } from 'react-router-dom'
import { useContentState } from '../content/content'
import { supabaseConfigured } from '../lib/supabase'
import { Button, MultilingualGreeting, Notice, Screen } from '../components/ui'
import { SetupNeeded } from '../components/SetupNeeded'
import { WarmupView } from '../components/WarmupView'
import { MusicButton } from '../components/MusicButton'

export default function Warmup() {
  const { content, loading, error } = useContentState()

  if (!supabaseConfigured) return <SetupNeeded />

  if (loading && !content) {
    return (
      <Screen className="justify-center">
        <p className="text-center text-paper/50">Warm-up laden…</p>
      </Screen>
    )
  }
  if (!content) {
    return (
      <Screen className="justify-center">
        <Notice tone="error">{error ?? 'Kon de warm-up niet laden.'}</Notice>
      </Screen>
    )
  }

  return (
    <Screen>
      <header className="mb-4">
        <MultilingualGreeting />
        <h1 className="font-display mt-2 text-2xl font-bold text-paper">Warm-up - thuis oefenen</h1>
        <p className="text-sm text-paper/60">
          Vrijblijvend; dit telt niet mee voor het klassement.
        </p>
        <div className="mt-3">
          <MusicButton />
        </div>
      </header>

      <WarmupView />

      <div className="mt-8 flex flex-col items-center gap-2">
        <Link to="/join">
          <Button variant="secondary">Klaar om mee te doen? Join een sessie →</Button>
        </Link>
        <Link to="/" className="text-xs text-paper/40 underline underline-offset-4">
          Terug
        </Link>
      </div>
    </Screen>
  )
}
