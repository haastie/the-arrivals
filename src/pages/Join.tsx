import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { joinSession } from '../lib/api'
import { saveParticipant } from '../lib/identity'
import { supabaseConfigured } from '../lib/supabase'
import { Button, MultilingualGreeting, Notice, Screen } from '../components/ui'
import { SetupNeeded } from '../components/SetupNeeded'

export default function Join() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!supabaseConfigured) return <SetupNeeded />

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedName) return setError('Vul je naam in.')
    if (trimmedCode.length < 4) return setError('Vul de sessiecode in.')

    setBusy(true)
    try {
      const p = await joinSession(trimmedCode, trimmedName)
      saveParticipant({ participantId: p.id, sessionId: p.session_id, name: p.name })
      navigate('/play')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Joinen mislukte'
      setError(msg.includes('invalid_code') ? 'Onbekende sessiecode.' : msg)
      setBusy(false)
    }
  }

  return (
    <Screen className="justify-center">
      <form onSubmit={handleJoin} className="ta-rise flex flex-col gap-5">
        <div>
          <MultilingualGreeting />
          <h1 className="font-display mt-2 text-3xl font-bold text-paper">Doe mee</h1>
          <p className="mt-1 text-sm text-paper/60">
            Kies een naam en vul de sessiecode in die de gids deelt.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-paper/80">Je naam</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            maxLength={24}
            placeholder="bv. María"
            className="min-h-12 rounded-2xl bg-paper px-4 py-3 text-lg text-ink outline-none focus:ring-2 focus:ring-amber-glow"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-paper/80">Sessiecode</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={6}
            placeholder="bv. JH2126"
            className="min-h-12 rounded-2xl bg-paper px-4 py-3 text-2xl font-bold tracking-[0.2em] text-ink uppercase outline-none focus:ring-2 focus:ring-amber-glow"
          />
        </label>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" block disabled={busy}>
          {busy ? 'Bezig…' : 'Meedoen'}
        </Button>

        <Link to="/" className="text-center text-xs text-paper/40 underline underline-offset-4">
          Terug
        </Link>
      </form>
    </Screen>
  )
}
