import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { createSession, hostSetPhase } from '../lib/api'
import {
  loadHostSecret,
  loadLastHostSession,
  saveHostSecret,
} from '../lib/identity'
import { supabaseConfigured } from '../lib/supabase'
import { useGameState } from '../hooks/useGameState'
import type { Phase } from '../lib/db-types'
import { useContentState } from '../content/content'
import { Button, ConnectionBadge, MultilingualGreeting, Notice, Screen } from '../components/ui'
import { SetupNeeded } from '../components/SetupNeeded'
import { FinishView } from '../components/FinishView'
import {
  HostActivePanel,
  HostActivityPicker,
  HostBriefing,
  HostJoinPanel,
  HostLeaderboard,
  HostLobby,
  HostQuestionPicker,
  HostTestTools,
} from '../components/host'

export default function Master() {
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Sessie + secret: uit de URL (?s=&secret=) of uit localStorage.
  const sessionId = params.get('s')
  const secret = sessionId ? (params.get('secret') ?? loadHostSecret(sessionId)) : null

  // Zorg dat een secret uit de URL ook lokaal bewaard wordt (terugkeren werkt dan).
  useEffect(() => {
    if (sessionId && secret) saveHostSecret(sessionId, secret)
  }, [sessionId, secret])

  if (!supabaseConfigured) return <SetupNeeded />

  if (!sessionId || !secret) {
    return (
      <HostStart
        creating={creating}
        error={createError}
        onCreate={async () => {
          setCreating(true)
          setCreateError(null)
          try {
            const s = await createSession()
            saveHostSecret(s.id, s.host_secret)
            setParams({ s: s.id, secret: s.host_secret })
          } catch (e) {
            setCreateError(e instanceof Error ? e.message : 'Aanmaken mislukte')
            setCreating(false)
          }
        }}
      />
    )
  }

  return <HostConsole sessionId={sessionId} secret={secret} />
}

function HostStart({
  creating,
  error,
  onCreate,
}: {
  creating: boolean
  error: string | null
  onCreate: () => void
}) {
  const last = loadLastHostSession()
  const { content } = useContentState()
  return (
    <Screen className="justify-center">
      <div className="ta-rise flex flex-col gap-5">
        <div>
          <MultilingualGreeting />
          <h1 className="font-display mt-2 text-3xl font-bold text-paper">
            Host · {content?.meta.title ?? 'The Arrivals'}
          </h1>
          <p className="mt-1 text-sm text-paper/60">
            Maak een nieuwe sessie aan. Je krijgt een join-code + QR voor de groep.
          </p>
        </div>
        <Button block onClick={onCreate} disabled={creating}>
          {creating ? 'Aanmaken…' : 'Nieuwe sessie aanmaken'}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
        {last && (
          <a
            href={`/master?s=${last.sessionId}&secret=${last.secret}`}
            className="text-center text-sm text-amber-glow underline underline-offset-4"
          >
            Verder met je laatste sessie →
          </a>
        )}
      </div>
    </Screen>
  )
}

function HostConsole({ sessionId, secret }: { sessionId: string; secret: string }) {
  const { content, loading: contentLoading } = useContentState()
  const { session, participants, answers, loading, connection, error } = useGameState(sessionId)

  if ((loading && !session) || (contentLoading && !content)) {
    return (
      <Screen className="justify-center">
        <p className="text-center text-paper/50">Laden…</p>
      </Screen>
    )
  }

  if (!session) {
    return (
      <Screen className="justify-center gap-3">
        <Notice tone="error">{error ?? 'Sessie niet gevonden.'}</Notice>
        <a href="/master" className="text-center text-sm text-paper/60 underline">
          Nieuwe sessie
        </a>
      </Screen>
    )
  }

  if (!content) {
    return (
      <Screen className="justify-center">
        <Notice tone="error">Content kon niet laden.</Notice>
      </Screen>
    )
  }

  const ctx = { session, secret, participants, answers }

  function setPhase(phase: Phase) {
    return hostSetPhase(sessionId, secret, phase)
  }

  return (
    <Screen>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <MultilingualGreeting />
          <h1 className="font-display text-xl font-bold text-paper">Host-console</h1>
        </div>
        <ConnectionBadge status={connection} />
      </header>

      <PhaseSwitcher phase={session.phase} onSet={setPhase} />

      <Link to="/eten" className="mt-3 block">
        <Button variant="secondary" block>
          🍽 Eten- & taalkaart openen
        </Button>
      </Link>

      <main className="mt-4 flex flex-col gap-4">
        <HostJoinPanel session={session} />

        {session.phase === 'warmup' && (
          <>
            <HostBriefing />
            <HostLobby participants={participants} onStart={() => setPhase('live')} />
          </>
        )}

        {session.phase === 'live' && (
          <>
            <HostActivePanel ctx={ctx} />
            {(session.active_status === 'idle' || !session.active_question_id) && (
              <HostQuestionPicker session={session} secret={secret} />
            )}
            <HostActivityPicker session={session} secret={secret} />
            <HostLeaderboard ctx={ctx} />
            <HostTestTools session={session} secret={secret} />
          </>
        )}

        {session.phase === 'finished' && (
          <>
            <FinishView participants={participants} answers={answers} />
            <HostLeaderboard ctx={ctx} />
          </>
        )}
      </main>

      <footer className="mt-8 text-center text-xs text-paper/30">
        {participants.length} deelnemers · sessie {session.join_code}
      </footer>
    </Screen>
  )
}

function PhaseSwitcher({ phase, onSet }: { phase: Phase; onSet: (p: Phase) => void }) {
  const phases: { id: Phase; label: string }[] = [
    { id: 'warmup', label: 'Warm-up' },
    { id: 'live', label: 'Wandeling' },
    { id: 'finished', label: 'Slot' },
  ]
  return (
    <div className="flex gap-1 rounded-2xl bg-paper/10 p-1">
      {phases.map((p) => (
        <button
          key={p.id}
          onClick={() => onSet(p.id)}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
            phase === p.id ? 'bg-amber-glow text-ink' : 'text-paper/60'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
