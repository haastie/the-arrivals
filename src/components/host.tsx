import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useContent } from '../content/content'
import type { Question, Stop } from '../content/types'
import type { ActiveStatus, AnswerRow, ParticipantRow, PublicSession } from '../lib/db-types'
import {
  addTestParticipant,
  simulateAnswers,
} from '../lib/test-api'
import {
  hostAdjustPoints,
  hostClearActive,
  hostJudgeOpen,
  hostPushActivity,
  hostPushQuestion,
  hostRevealMc,
  hostSetStatus,
} from '../lib/api'
import { Button, Card } from './ui'

interface HostCtx {
  session: PublicSession
  secret: string
  participants: ParticipantRow[]
  answers: AnswerRow[]
}

// --- Join-code + QR -----------------------------------------------------
export function HostJoinPanel({ session }: { session: PublicSession }) {
  const [show, setShow] = useState(true)
  const joinUrl = `${window.location.origin}/join?code=${session.join_code}`

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold tracking-wider text-ink/50 uppercase">Join-code</div>
          <div className="font-display text-3xl font-bold tracking-[0.15em] text-ink">
            {session.join_code}
          </div>
        </div>
        <Button variant="secondary" onClick={() => setShow((v) => !v)}>
          {show ? 'Verberg QR' : 'Toon QR'}
        </Button>
      </div>
      {show && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="rounded-2xl bg-white p-3">
            <QRCodeSVG value={joinUrl} size={180} level="M" />
          </div>
          <p className="text-center text-xs break-all text-ink/50">{joinUrl}</p>
        </div>
      )}
    </Card>
  )
}

// --- Lobby (warm-up) ----------------------------------------------------
export function HostLobby({
  participants,
  onStart,
}: {
  participants: ParticipantRow[]
  onStart: () => void
}) {
  return (
    <Card>
      <h3 className="font-display text-lg font-bold">Lobby · warm-up</h3>
      <p className="mt-1 text-sm text-ink/60">
        Deelnemers doen zelf de warm-up. Start de wandeling als iedereen er is.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {participants.length === 0 && <li className="text-sm text-ink/40">Nog niemand…</li>}
        {participants.map((p) => (
          <li key={p.id} className="rounded-full bg-ink/10 px-3 py-1 text-sm font-medium text-ink">
            {p.name}
          </li>
        ))}
      </ul>
      <Button block className="mt-4" onClick={onStart}>
        Start de wandeling →
      </Button>
    </Card>
  )
}

// --- Vraag kiezen en pushen --------------------------------------------
export function HostQuestionPicker({ session, secret }: { session: PublicSession; secret: string }) {
  const { stopsWithQuestions, warmup } = useContent()
  const [open, setOpen] = useState<string | null>(stopsWithQuestions[0]?.id ?? null)

  async function push(q: Question) {
    await hostPushQuestion(session.id, secret, q.id)
  }

  return (
    <Card>
      <h3 className="font-display text-lg font-bold">Kies een vraag</h3>
      <p className="mt-1 text-sm text-ink/60">Tik een stop open en stuur een vraag naar de groep.</p>

      <div className="mt-3 flex flex-col gap-2">
        {stopsWithQuestions.map((stop) => (
          <div key={stop.id} className="overflow-hidden rounded-2xl bg-ink/5">
            <button
              onClick={() => setOpen((v) => (v === stop.id ? null : stop.id))}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-ink">
                Stop {stop.number} · {stop.name}
              </span>
              <span className="text-ink/40">{open === stop.id ? '▲' : '▼'}</span>
            </button>
            {open === stop.id && (
              <div className="flex flex-col gap-2 px-3 pb-3">
                {stop.questions.map((q) => (
                  <QuestionPushRow key={q.id} q={q} onPush={() => push(q)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-ink/50">Warm-up-vragen (ook pushbaar)</summary>
        <div className="mt-2 flex flex-col gap-2">
          {warmup.questions.map((q) => (
            <QuestionPushRow key={q.id} q={q} onPush={() => hostPushQuestion(session.id, secret, q.id)} />
          ))}
        </div>
      </details>
    </Card>
  )
}

function QuestionPushRow({ q, onPush }: { q: Question; onPush: () => void }) {
  const { isTimelineQuestion } = useContent()
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase">
          <span className={q.type === 'mc' ? 'text-sky-700' : 'text-clay'}>{q.type}</span>
          {isTimelineQuestion(q.id) && <span className="text-amber-600">🕰️</span>}
          <span className="text-ink/40">{q.points}p</span>
        </div>
        <p className="truncate text-sm text-ink">{q.prompt}</p>
      </div>
      <Button
        onClick={async () => {
          setBusy(true)
          try {
            await onPush()
          } finally {
            setBusy(false)
          }
        }}
        disabled={busy}
        className="shrink-0 px-3 py-2 text-sm"
      >
        Stuur
      </Button>
    </div>
  )
}

// --- Activiteitenkaart pushen ------------------------------------------
export function HostActivityPicker({ session, secret }: { session: PublicSession; secret: string }) {
  const { stops } = useContent()
  const acts = stops.flatMap((s) => (s.activities ?? []).map((a) => ({ activity: a, stop: s })))
  if (acts.length === 0) return null
  return (
    <Card>
      <h3 className="font-display text-lg font-bold">Activiteiten</h3>
      <p className="mt-1 text-sm text-ink/60">Push een instructiekaart (geen scoring).</p>
      <div className="mt-3 flex flex-col gap-2">
        {acts.map(({ activity, stop }) => (
          <div key={activity.id} className="flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{activity.title}</p>
              <p className="truncate text-xs text-ink/40">Stop {stop.number} · {stop.name}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => hostPushActivity(session.id, secret, activity.id)}
              className="shrink-0 px-3 py-2 text-sm"
            >
              Push
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// --- Actieve vraag besturen --------------------------------------------
export function HostActivePanel({ ctx }: { ctx: HostCtx }) {
  const { isActivityId, findActivity, findQuestion } = useContent()
  const { session, secret, participants, answers } = ctx
  const activeId = session.active_question_id
  const status = session.active_status

  if (!activeId || status === 'idle') return null

  // Activiteitenkaart actief
  if (status === 'activity' && isActivityId(activeId)) {
    const found = findActivity(activeId)
    return (
      <Card accent>
        <div className="text-xs font-semibold tracking-wider text-clay uppercase">Actieve activiteit</div>
        <h3 className="font-display mt-1 text-xl font-bold text-ink">{found?.activity.title}</h3>
        <p className="mt-1 text-sm text-ink/70">{found?.activity.body}</p>
        <Button block variant="secondary" className="mt-4" onClick={() => hostClearActive(session.id, secret)}>
          Sluiten / volgende
        </Button>
      </Card>
    )
  }

  const loc = findQuestion(activeId)
  if (!loc) return null
  const q = loc.question
  const qAnswers = answers.filter((a) => a.question_id === activeId)
  const nameOf = new Map(participants.map((p) => [p.id, p.name]))

  return (
    <Card accent>
      <ActivePanelHeader stop={loc.stop} q={q} status={status} />
      <p className="font-display mt-1 text-lg leading-snug font-bold text-ink">{q.prompt}</p>

      {q.type === 'mc' ? (
        <McControl ctx={ctx} q={q} qAnswers={qAnswers} />
      ) : (
        <OpenControl ctx={ctx} q={q} qAnswers={qAnswers} nameOf={nameOf} />
      )}

      <div className="mt-4 flex gap-2">
        {status === 'open' && (
          <Button variant="secondary" block onClick={() => hostSetStatus(session.id, secret, 'locked')}>
            Sluiten
          </Button>
        )}
        {status === 'locked' && (
          <Button variant="ghost" onClick={() => hostSetStatus(session.id, secret, 'open')} className="px-3">
            Heropenen
          </Button>
        )}
        <Button variant="ghost" onClick={() => hostClearActive(session.id, secret)} className="px-3">
          Volgende →
        </Button>
      </div>
    </Card>
  )
}

function ActivePanelHeader({ stop, q, status }: { stop?: Stop; q: Question; status: ActiveStatus }) {
  const { isTimelineQuestion } = useContent()
  const label =
    status === 'open' ? 'Open — inzendingen komen binnen'
      : status === 'locked' ? 'Gesloten'
        : status === 'revealed' ? 'Onthuld' : ''
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase">
      <span className="text-ink/40">{stop ? `Stop ${stop.number}` : 'Warm-up'}</span>
      <span className={q.type === 'mc' ? 'text-sky-700' : 'text-clay'}>{q.type}</span>
      {isTimelineQuestion(q.id) && <span className="text-amber-600">🕰️</span>}
      <span className="text-jade">{label}</span>
    </div>
  )
}

function McControl({
  ctx,
  q,
  qAnswers,
}: {
  ctx: HostCtx
  q: Question
  qAnswers: AnswerRow[]
}) {
  const { session, secret, participants } = ctx
  const revealed = session.active_status === 'revealed'
  const counts = (q.options ?? []).map(
    (_, i) => qAnswers.filter((a) => a.response === String(i)).length,
  )
  const total = qAnswers.length

  return (
    <div className="mt-3 flex flex-col gap-2">
      {(q.options ?? []).map((opt, i) => {
        const correct = i === q.correctIndex
        const pct = total ? Math.round((counts[i] / total) * 100) : 0
        return (
          <div
            key={i}
            className={`rounded-2xl p-3 ${
              revealed && correct ? 'bg-jade/15 ring-1 ring-jade' : 'bg-ink/5'
            }`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink">
                {opt} {revealed && correct && '✓'}
              </span>
              <span className="font-bold tabular-nums text-ink/70">{counts[i]}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/10">
              <div
                className={`h-full rounded-full ${revealed && correct ? 'bg-jade' : 'bg-sky-600'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <p className="text-xs text-ink/50">
        {total} / {participants.length} geantwoord
      </p>
      {!revealed && (
        <Button
          variant="success"
          block
          onClick={() =>
            hostRevealMc({ sessionId: session.id, secret, questionId: q.id })
          }
        >
          Toon antwoord + score
        </Button>
      )}
    </div>
  )
}

function OpenControl({
  ctx,
  q,
  qAnswers,
  nameOf,
}: {
  ctx: HostCtx
  q: Question
  qAnswers: AnswerRow[]
  nameOf: Map<string, string>
}) {
  const { session, secret } = ctx
  const revealed = session.active_status === 'revealed'

  return (
    <div className="mt-3 flex flex-col gap-2">
      {q.modelAnswer && (
        <div className="rounded-2xl bg-amber-glow/15 px-3 py-2 text-xs text-ink/70">
          <span className="font-semibold text-clay">Rubric · </span>
          {q.modelAnswer}
        </div>
      )}

      {qAnswers.length === 0 && <p className="text-sm text-ink/40">Nog geen inzendingen…</p>}

      {qAnswers.map((a) => (
        <div key={a.id} className="rounded-2xl bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink/50">{nameOf.get(a.participant_id) ?? '?'}</p>
              <p className="text-sm text-ink">{a.response}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => hostJudgeOpen({ answerId: a.id, secret, correct: true })}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                  a.status === 'correct' ? 'bg-jade text-white' : 'bg-jade/15 text-jade'
                }`}
                aria-label="Goed"
              >
                ✓
              </button>
              <button
                onClick={() => hostJudgeOpen({ answerId: a.id, secret, correct: false })}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                  a.status === 'incorrect' ? 'bg-rose-mark text-white' : 'bg-rose-mark/10 text-rose-mark'
                }`}
                aria-label="Fout"
              >
                ✗
              </button>
            </div>
          </div>
        </div>
      ))}

      {!revealed && (
        <Button variant="success" block onClick={() => hostSetStatus(session.id, secret, 'revealed')}>
          Toon modelantwoord
        </Button>
      )}
    </div>
  )
}

// --- Host-leaderboard met handmatige correctie -------------------------
export function HostLeaderboard({ ctx }: { ctx: HostCtx }) {
  const { session, secret, participants, answers } = ctx
  const ranked = [...participants].sort((a, b) => b.score - a.score)

  function adjust(participantId: string, delta: number) {
    return hostAdjustPoints({ sessionId: session.id, secret, participantId, delta })
  }

  return (
    <Card>
      <h3 className="font-display text-lg font-bold">Klassement · handmatig bijstellen</h3>
      <ul className="mt-3 flex flex-col gap-1.5">
        {ranked.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-2xl bg-ink/5 px-3 py-2">
            <span className="w-5 text-center text-sm font-bold text-ink/50">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{p.name}</span>
            <button
              onClick={() => adjust(p.id, -1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-lg text-ink"
              aria-label="Min"
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-bold tabular-nums text-clay">{p.score}</span>
            <button
              onClick={() => adjust(p.id, 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-lg text-ink"
              aria-label="Plus"
            >
              +
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink/40">{answers.length} inzendingen totaal</p>
    </Card>
  )
}

// --- Testgereedschap: simuleer deelnemers + antwoorden -----------------
export function HostTestTools({ session, secret }: { session: PublicSession; secret: string }) {
  const names = ['Testpiet', 'Testanna', 'Testomar', 'Testlin']
  const [n, setN] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  async function add() {
    setErr(null)
    try {
      await addTestParticipant(session.id, secret, `${names[n % names.length]} ${n + 1}`)
      setN(n + 1)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Mislukt')
    }
  }

  async function simulate() {
    setErr(null)
    try {
      if (session.active_question_id) await simulateAnswers(session.id, secret, session.active_question_id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Mislukt')
    }
  }

  return (
    <Card>
      <h3 className="font-display text-lg font-bold">Testgereedschap</h3>
      <p className="mt-1 text-sm text-ink/60">Voor solo-testen van de live-flow.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={add}>
          + Testdeelnemer
        </Button>
        <Button
          variant="secondary"
          disabled={session.active_status !== 'open' || !session.active_question_id}
          onClick={simulate}
        >
          Simuleer antwoorden
        </Button>
      </div>
      {err && <p className="mt-2 text-sm text-rose-mark">{err}</p>}
    </Card>
  )
}
