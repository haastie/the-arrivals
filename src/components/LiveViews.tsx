import { useState } from 'react'
import type { Question, Stop, Activity } from '../content/types'
import { submitLiveAnswer } from '../lib/api'
import type { ActiveStatus, AnswerRow } from '../lib/db-types'
import type { ParticipantIdentity } from '../lib/identity'
import { isTimelineQuestion } from '../content/content'
import { Button, Card, Notice } from './ui'
import { StopHeader } from './StopHeader'

export function WaitingView({ name }: { name: string }) {
  return (
    <Card className="text-center">
      <div className="py-6">
        <div className="text-3xl">🧭</div>
        <h2 className="font-display mt-3 text-xl font-bold">Wacht op de gids…</h2>
        <p className="mt-1 text-sm text-ink/60">
          {name}, je bent in de wandeling. Je scherm springt vanzelf mee zodra er een vraag of
          activiteit komt.
        </p>
      </div>
    </Card>
  )
}

export function ActivityView({ activity, stop }: { activity: Activity; stop: Stop }) {
  return (
    <div className="ta-rise flex flex-col gap-3">
      <StopHeader stop={stop} />
      <Card accent>
        <div className="text-xs font-semibold tracking-wider text-clay uppercase">Activiteit</div>
        <h3 className="font-display mt-1 text-2xl font-bold text-ink">{activity.title}</h3>
        <p className="mt-2 text-base leading-relaxed text-ink/80">{activity.body}</p>
      </Card>
    </div>
  )
}

export function LiveQuestionView({
  question,
  stop,
  status,
  me,
  myAnswer,
}: {
  question: Question
  stop?: Stop
  status: ActiveStatus
  me: ParticipantIdentity
  myAnswer?: AnswerRow
}) {
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState(myAnswer?.response ?? '')
  const [err, setErr] = useState<string | null>(null)
  const isOpen = status === 'open'
  const revealed = status === 'revealed'
  const timeline = isTimelineQuestion(question.id)

  async function pick(index: number) {
    if (!isOpen || busy) return
    setBusy(true)
    setErr(null)
    try {
      await submitLiveAnswer({
        sessionId: me.sessionId,
        participantId: me.participantId,
        questionId: question.id,
        response: String(index),
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Insturen mislukte')
    } finally {
      setBusy(false)
    }
  }

  async function submitOpen() {
    if (!isOpen || busy || !text.trim()) return
    setBusy(true)
    setErr(null)
    try {
      await submitLiveAnswer({
        sessionId: me.sessionId,
        participantId: me.participantId,
        questionId: question.id,
        response: text.trim(),
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Insturen mislukte')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ta-rise flex flex-col gap-3">
      {stop && <StopHeader stop={stop} />}

      <Card accent={isOpen}>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          {timeline && <span className="text-amber-glow">🕰️ Tijdlijn</span>}
          <span className="text-ink/40">
            {isOpen ? 'Actieve vraag' : status === 'locked' ? 'Gesloten' : revealed ? 'Onthuld' : ''}
          </span>
        </div>
        <p className="font-display text-xl leading-snug font-bold text-ink">{question.prompt}</p>

        {/* Multiple choice */}
        {question.type === 'mc' && question.options && (
          <div className="mt-4 flex flex-col gap-2">
            {question.options.map((opt, i) => {
              const chosen = myAnswer?.response === String(i)
              const correct = i === question.correctIndex
              let cls = 'bg-ink/5 text-ink'
              if (revealed) {
                if (correct) cls = 'bg-jade/15 text-jade ring-2 ring-jade'
                else if (chosen) cls = 'bg-rose-mark/10 text-rose-mark ring-1 ring-rose-mark'
                else cls = 'bg-ink/5 text-ink/40'
              } else if (chosen) {
                cls = 'bg-amber-glow/25 text-ink ring-2 ring-amber-glow'
              } else if (isOpen) {
                cls = 'bg-ink/5 text-ink hover:bg-ink/10'
              }
              return (
                <button
                  key={i}
                  disabled={!isOpen || busy}
                  onClick={() => pick(i)}
                  className={`min-h-12 rounded-2xl px-4 py-3 text-left text-base transition disabled:cursor-default ${cls}`}
                >
                  {opt}
                  {revealed && correct && ' ✓'}
                  {revealed && chosen && !correct && ' ✗'}
                </button>
              )
            })}
          </div>
        )}

        {/* Open vraag */}
        {question.type === 'open' && (
          <div className="mt-4 flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!isOpen}
              rows={3}
              placeholder="Typ je antwoord…"
              className="rounded-2xl bg-ink/5 px-4 py-3 text-base text-ink outline-none focus:ring-2 focus:ring-amber-glow disabled:opacity-70"
            />
            {isOpen && (
              <Button onClick={submitOpen} disabled={busy || !text.trim()}>
                {myAnswer ? 'Antwoord bijwerken' : 'Insturen'}
              </Button>
            )}
            {revealed && question.modelAnswer && (
              <div className="mt-1 rounded-2xl bg-jade/10 px-4 py-3 text-sm text-ink/80">
                <span className="font-semibold text-jade">Modelantwoord · </span>
                {question.modelAnswer}
              </div>
            )}
          </div>
        )}
      </Card>

      {err && <Notice tone="error">{err}</Notice>}

      <ParticipantResult question={question} status={status} myAnswer={myAnswer} />
    </div>
  )
}

function ParticipantResult({
  question,
  status,
  myAnswer,
}: {
  question: Question
  status: ActiveStatus
  myAnswer?: AnswerRow
}) {
  if (status === 'open') {
    return myAnswer ? (
      <Notice tone="info">Ingestuurd ✓ Je kunt nog wijzigen zolang de vraag open staat.</Notice>
    ) : null
  }
  if (status === 'locked') {
    return (
      <Notice tone="warn">
        {myAnswer ? 'Gesloten — wacht op de gids.' : 'Je hebt niet geantwoord. Gesloten.'}
      </Notice>
    )
  }
  if (status === 'revealed') {
    if (!myAnswer) return <Notice tone="warn">Je had geen antwoord ingestuurd.</Notice>
    const good = myAnswer.status === 'correct'
    return (
      <div
        className={`rounded-2xl px-4 py-3 text-center text-base font-bold ${
          good ? 'bg-jade text-white' : 'bg-rose-mark text-white'
        }`}
      >
        {good ? `Goed! +${myAnswer.awarded_points}` : 'Helaas — 0 punten'}
        {question.type === 'open' && !good && myAnswer.status === 'pending' && (
          <span className="block text-sm font-normal">Nog niet beoordeeld…</span>
        )}
      </div>
    )
  }
  return null
}
