import { useContent } from '../content/content'
import { overallWinners } from '../lib/score'
import type { ParticipantRow } from '../lib/db-types'
import { Card } from './ui'
import { Leaderboard } from './Leaderboard'

export function FinishView({
  participants,
  highlightId,
}: {
  participants: ParticipantRow[]
  highlightId?: string
}) {
  const { meta, stops } = useContent()
  // Slot = de laatste discussievraag in de tour.
  const slotQuestion = [...stops]
    .reverse()
    .flatMap((s) => s.questions)
    .find((q) => q.discussion)
  const { winners, topScore } = overallWinners(participants)

  return (
    <div className="ta-rise flex flex-col gap-5">
      <div className="text-center">
        <div className="text-3xl">🏁</div>
        <h2 className="font-display mt-2 text-2xl font-bold text-paper">Eindstand</h2>
        <p className="mt-2 border-l-2 border-amber-glow/60 pl-4 text-left text-sm leading-relaxed text-paper/75">
          {meta.closingLine}
        </p>
      </div>

      {winners.length > 0 && (
        <Card accent>
          <div className="text-xs font-semibold tracking-wider text-clay uppercase">🏆 Winnaar</div>
          <p className="font-display mt-1 text-xl font-bold text-ink">
            {winners.map((w) => w.name).join(' & ')}
          </p>
          <p className="text-sm text-ink/60">{topScore} punten - de hoogste score van de dag 🍒</p>
        </Card>
      )}

      <Card>
        <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink/50 uppercase">
          Totaalklassement
        </h3>
        <Leaderboard participants={participants} highlightId={highlightId} />
      </Card>

      {slotQuestion && (
        <Card>
          <div className="text-xs font-semibold tracking-wider text-clay uppercase">
            Slotvraag · discussie
          </div>
          <p className="font-display mt-1 text-lg leading-snug font-bold text-ink">
            {slotQuestion.prompt}
          </p>
          <p className="mt-2 text-xs text-ink/40">Niet gescoord - laat de groep het laatste woord.</p>
        </Card>
      )}
    </div>
  )
}
