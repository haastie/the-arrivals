import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadParticipant, type ParticipantIdentity } from '../lib/identity'
import { supabaseConfigured } from '../lib/supabase'
import { useGameState } from '../hooks/useGameState'
import { findActivity, findQuestion, isActivityId, meta } from '../content/content'
import { ConnectionBadge, MultilingualGreeting, Notice, Screen } from '../components/ui'
import { SetupNeeded } from '../components/SetupNeeded'
import { WarmupView } from '../components/WarmupView'
import { ActivityView, LiveQuestionView, WaitingView } from '../components/LiveViews'
import { Leaderboard } from '../components/Leaderboard'
import { FinishView } from '../components/FinishView'

export default function Play() {
  const navigate = useNavigate()
  const [me] = useState<ParticipantIdentity | null>(() => loadParticipant())
  const { session, participants, answers, loading, connection, error } = useGameState(
    me?.sessionId,
  )

  useEffect(() => {
    if (!me) navigate('/join', { replace: true })
  }, [me, navigate])

  if (!supabaseConfigured) return <SetupNeeded />
  if (!me) return null

  if (loading && !session) {
    return (
      <Screen className="justify-center">
        <p className="text-center text-paper/50">Sessie laden…</p>
      </Screen>
    )
  }

  if (!session) {
    return (
      <Screen className="justify-center gap-4">
        <Notice tone="error">
          {error ?? 'Deze sessie bestaat niet meer.'}
        </Notice>
        <button
          onClick={() => {
            localStorage.removeItem('ta_participant')
            navigate('/join', { replace: true })
          }}
          className="text-sm text-paper/60 underline underline-offset-4"
        >
          Opnieuw joinen
        </button>
      </Screen>
    )
  }

  const myAnswers = answers.filter((a) => a.participant_id === me.participantId)
  const activeId = session.active_question_id
  const activeAnswer = myAnswers.find((a) => a.question_id === activeId)

  return (
    <Screen>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <MultilingualGreeting />
          <p className="text-sm font-semibold text-paper">{me.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-paper/10 px-2.5 py-1 text-xs text-paper/60">
            {session.join_code}
          </span>
          <ConnectionBadge status={connection} />
        </div>
      </header>

      <main className="flex-1">
        {session.phase === 'warmup' && (
          <div className="flex flex-col gap-5">
            <LobbyStrip participants={participants.length} />
            <WarmupView me={me} answers={myAnswers} />
          </div>
        )}

        {session.phase === 'live' && (
          <>
            {session.active_status === 'activity' && isActivityId(activeId) ? (
              <ActivityView {...findActivity(activeId)!} />
            ) : activeId && session.active_status !== 'idle' && findQuestion(activeId) ? (
              <LiveQuestionView
                question={findQuestion(activeId)!.question}
                stop={findQuestion(activeId)!.stop}
                status={session.active_status}
                me={me}
                myAnswer={activeAnswer}
              />
            ) : (
              <WaitingView name={me.name} />
            )}

            <section className="mt-6">
              <h3 className="mb-2 px-1 text-sm font-semibold tracking-wide text-paper/60 uppercase">
                Klassement
              </h3>
              <div className="rounded-3xl bg-paper p-3">
                <Leaderboard
                  participants={participants}
                  answers={answers}
                  highlightId={me.participantId}
                  compact
                />
              </div>
            </section>
          </>
        )}

        {session.phase === 'finished' && (
          <FinishView
            participants={participants}
            answers={answers}
            highlightId={me.participantId}
          />
        )}
      </main>

      <footer className="mt-8 text-center text-xs text-paper/30">{meta.title}</footer>
    </Screen>
  )
}

function LobbyStrip({ participants }: { participants: number }) {
  return (
    <Notice tone="info">
      Je bent binnen — <strong>{participants}</strong>{' '}
      {participants === 1 ? 'deelnemer' : 'deelnemers'} in de lobby. Doe alvast de warm-up.
    </Notice>
  )
}
