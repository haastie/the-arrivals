import type { ParticipantRow } from './db-types'

export interface RankedParticipant extends ParticipantRow {
  rank: number
}

/**
 * Sorteert deelnemers op totaalscore (aflopend), daarna op joined_at.
 * Berekent de rang (gedeelde rang bij gelijke score).
 */
export function rankParticipants(participants: ParticipantRow[]): RankedParticipant[] {
  const sorted = [...participants]
    .map((p) => ({ ...p, rank: 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
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

/** Winnaar(s): de hoogste totaalscore (gedeeld bij gelijkspel). */
export function overallWinners(participants: ParticipantRow[]): {
  winners: RankedParticipant[]
  topScore: number
} {
  const ranked = rankParticipants(participants)
  const top = Math.max(0, ...ranked.map((p) => p.score))
  return {
    winners: top > 0 ? ranked.filter((p) => p.score === top) : [],
    topScore: top,
  }
}
