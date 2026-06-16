import type { AnswerRow, ParticipantRow } from './db-types'

export interface RankedParticipant extends ParticipantRow {
  rank: number
  timelineScore: number
}

/**
 * Sorteert deelnemers op totaalscore (aflopend), met de Tijdlijn-score als
 * tiebreaker en daarna joined_at. Berekent ook de rang (gedeelde rang bij gelijk).
 */
export function rankParticipants(
  participants: ParticipantRow[],
  answers: AnswerRow[],
  timelineQuestionIds: string[],
): RankedParticipant[] {
  const timelinePoints = new Map<string, number>()
  for (const a of answers) {
    if (a.status === 'correct' && timelineQuestionIds.includes(a.question_id)) {
      timelinePoints.set(a.participant_id, (timelinePoints.get(a.participant_id) ?? 0) + a.awarded_points)
    }
  }

  const sorted = [...participants]
    .map((p) => ({ ...p, timelineScore: timelinePoints.get(p.id) ?? 0, rank: 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.timelineScore !== a.timelineScore) return b.timelineScore - a.timelineScore
      return a.joined_at.localeCompare(b.joined_at)
    })

  let lastScore: number | null = null
  let lastRank = 0
  sorted.forEach((p, i) => {
    if (p.score !== lastScore) {
      lastRank = i + 1
      lastScore = p.score
    }
    p.rank = lastRank
  })
  return sorted
}

/** Winnaar(s) van de Tijdlijn-kern (6 scorende vragen). */
export function timelineWinners(
  participants: ParticipantRow[],
  answers: AnswerRow[],
  timelineQuestionIds: string[],
): { winners: RankedParticipant[]; topScore: number } {
  const ranked = rankParticipants(participants, answers, timelineQuestionIds)
  const top = Math.max(0, ...ranked.map((p) => p.timelineScore))
  return {
    winners: top > 0 ? ranked.filter((p) => p.timelineScore === top) : [],
    topScore: top,
  }
}
