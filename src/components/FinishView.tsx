import { useContent } from '../content/content'
import { timelineWinners } from '../lib/score'
import type { AnswerRow, ParticipantRow } from '../lib/db-types'
import { Card } from './ui'
import { Leaderboard } from './Leaderboard'

export function FinishView({
  participants,
  answers,
  highlightId,
}: {
  participants: ParticipantRow[]
  answers: AnswerRow[]
  highlightId?: string
}) {
  const { meta, stops, timelineQuestionIds } = useContent()
  const slotStop = stops.find((s) => s.id === 's9')
  const slotQuestion = slotStop?.questions.find((q) => q.discussion)
  const { winners, topScore } = timelineWinners(participants, answers, timelineQuestionIds)

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
          <div className="text-xs font-semibold tracking-wider text-clay uppercase">
            🕰️ Tijdlijn-winnaar
          </div>
          <p className="font-display mt-1 text-xl font-bold text-ink">
            {winners.map((w) => w.name).join(' & ')}
          </p>
          <p className="text-sm text-ink/60">
            {topScore} punten op de zes Tijdlijn-vragen — de kers van de sundae 🍒
          </p>
        </Card>
      )}

      <Card>
        <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink/50 uppercase">
          Totaalklassement
        </h3>
        <Leaderboard
          participants={participants}
          answers={answers}
          highlightId={highlightId}
          showTimeline
        />
      </Card>

      {slotQuestion && (
        <Card>
          <div className="text-xs font-semibold tracking-wider text-clay uppercase">
            Slotvraag · discussie
          </div>
          <p className="font-display mt-1 text-lg leading-snug font-bold text-ink">
            {slotQuestion.prompt}
          </p>
          <p className="mt-2 text-xs text-ink/40">Niet gescoord — laat de groep het laatste woord.</p>
        </Card>
      )}
    </div>
  )
}
