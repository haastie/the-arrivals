import { useState, type CSSProperties } from 'react'
import { useContent } from '../content/content'
import type { Question } from '../content/types'
import { recordAnswer, type LocalAnswer } from '../lib/warmupLocal'
import { Button, Card, Notice } from './ui'

function RerollButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1.5 text-xs font-medium text-paper/80 transition hover:bg-paper/15"
    >
      <span aria-hidden>↻</span> Nieuwe vragen
    </button>
  )
}

/** Kies n willekeurige items (zonder de bron te muteren). */
function pickRandom<T>(items: T[], n: number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export function WarmupView() {
  const { warmup } = useContent()
  // Telkens 3 willekeurige warm-up-vragen; via de knop laad je een nieuwe set.
  // `round` verhoogt bij elke nieuwe set en dwingt een verse (onbeantwoorde)
  // weergave af, ook als dezelfde vraag opnieuw wordt getrokken.
  const [round, setRound] = useState(0)
  const [questions, setQuestions] = useState(() => pickRandom(warmup.questions, 3))

  function reroll() {
    setQuestions(pickRandom(warmup.questions, 3))
    setRound((r) => r + 1)
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="font-display text-xl font-bold">Warm-up</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/75">{warmup.intro}</p>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold tracking-wide text-paper/60 uppercase">Raad mee</h3>
          <RerollButton onClick={reroll} />
        </div>
        {questions.map((q, i) => (
          <div key={`${round}-${q.id}`} className="ta-stagger" style={{ '--i': i } as CSSProperties}>
            <WarmupQuestion q={q} />
          </div>
        ))}
        <div className="mt-1 flex justify-center">
          <RerollButton onClick={reroll} />
        </div>
      </section>

      <Notice tone="info">Vrijblijvend oefenen - dit telt niet mee voor het klassement.</Notice>
    </div>
  )
}

function WarmupQuestion({ q }: { q: Question }) {
  // Altijd vers beginnen: een (opnieuw) getoonde vraag is gewoon weer te beantwoorden.
  const [answer, setAnswer] = useState<LocalAnswer | undefined>(undefined)
  const [text, setText] = useState('')
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
        <div className="mt-2">
          <p className="text-sm font-medium text-ink/60">
            {answer?.correct ? 'Goed geraden ✓' : 'Niet helemaal - maar het is maar oefenen.'}
          </p>
          {q.type === 'mc' && q.modelAnswer && (
            <p className="mt-1 text-sm leading-relaxed text-ink/70">{q.modelAnswer}</p>
          )}
        </div>
      )}
    </Card>
  )
}
