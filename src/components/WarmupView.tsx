import { useState } from 'react'
import { useContent } from '../content/content'
import type { Question } from '../content/types'
import { loadProgress, recordAnswer, type LocalAnswer } from '../lib/warmupLocal'
import { Button, Card, Notice } from './ui'

export function WarmupView() {
  const { warmup, stops } = useContent()

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="font-display text-xl font-bold">Warm-up</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/75">{warmup.intro}</p>
      </Card>

      <section className="flex flex-col gap-3">
        <h3 className="px-1 text-sm font-semibold tracking-wide text-paper/60 uppercase">
          Lees de kaartjes
        </h3>
        {warmup.backgroundCards.map((c) => (
          <Card key={c.id}>
            <h4 className="font-display text-lg font-bold text-clay">{c.title}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/75">{c.body}</p>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="px-1 text-sm font-semibold tracking-wide text-paper/60 uppercase">
          Raad mee
        </h3>
        {warmup.questions.map((q) => (
          <WarmupQuestion key={q.id} q={q} />
        ))}
      </section>

      <ReadAhead stops={stops} />

      <Notice tone="info">Vrijblijvend oefenen — dit telt niet mee voor het klassement.</Notice>
    </div>
  )
}

function WarmupQuestion({ q }: { q: Question }) {
  const [answer, setAnswer] = useState<LocalAnswer | undefined>(() => loadProgress()[q.id])
  const [text, setText] = useState(answer?.response ?? '')
  const answered = !!answer

  function pick(index: number) {
    if (answered) return
    const correct = index === q.correctIndex
    const a: LocalAnswer = { response: String(index), correct, points: q.points }
    recordAnswer({ questionId: q.id, ...a })
    setAnswer(a)
  }

  function submitOpen() {
    if (answered || !text.trim()) return
    // Open warm-up-vraag: bij oefenen automatisch "goed" (geen host die beoordeelt).
    const a: LocalAnswer = { response: text.trim(), correct: true, points: q.points }
    recordAnswer({ questionId: q.id, ...a })
    setAnswer(a)
  }

  return (
    <Card accent={!answered}>
      <p className="font-medium text-ink">{q.prompt}</p>

      {q.type === 'mc' && q.options && (
        <div className="mt-3 flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const isChosen = answer?.response === String(i)
            const isCorrect = i === q.correctIndex
            let cls = 'bg-ink/5 text-ink hover:bg-ink/10'
            if (answered) {
              if (isCorrect) cls = 'bg-jade/15 text-jade ring-1 ring-jade'
              else if (isChosen) cls = 'bg-rose-mark/10 text-rose-mark ring-1 ring-rose-mark'
              else cls = 'bg-ink/5 text-ink/50'
            }
            return (
              <button
                key={i}
                disabled={answered}
                onClick={() => pick(i)}
                className={`min-h-12 rounded-2xl px-4 py-3 text-left text-base transition disabled:cursor-default ${cls}`}
              >
                {opt}
                {answered && isCorrect && ' ✓'}
                {answered && isChosen && !isCorrect && ' ✗'}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'open' && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={answered}
            rows={2}
            placeholder="Schrijf in één zin…"
            className="rounded-2xl bg-ink/5 px-4 py-3 text-base text-ink outline-none focus:ring-2 focus:ring-amber-glow disabled:opacity-70"
          />
          {!answered && (
            <Button onClick={submitOpen} disabled={!text.trim()}>
              Insturen
            </Button>
          )}
        </div>
      )}

      {answered && (
        <p className="mt-2 text-sm font-medium text-ink/60">
          {answer?.correct ? 'Goed geraden ✓' : 'Niet helemaal — maar het is maar oefenen.'}
        </p>
      )}
    </Card>
  )
}

/** Optioneel: lees de achtergrond per stop alvast (zónder tour-reveals). */
function ReadAhead({ stops }: { stops: ReturnType<typeof useContent>['stops'] }) {
  const [open, setOpen] = useState(false)
  const readable = stops.filter((s) => s.background)

  return (
    <section className="flex flex-col gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between rounded-2xl bg-paper/10 px-4 py-3 text-left text-sm font-semibold text-paper/80"
      >
        <span>Lees alvast — achtergrond per stop</span>
        <span className="text-paper/50">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          <p className="px-1 text-xs text-paper/40">
            Dit is de context, niet de clou — de onthullingen bewaren we voor onderweg.
          </p>
          {readable.map((s) => (
            <Card key={s.id}>
              <div className="text-xs font-medium tracking-wider text-clay uppercase">
                Stop {s.number} · {s.era}
              </div>
              <h4 className="font-display text-lg font-bold text-ink">{s.name}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/75">{s.background}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
