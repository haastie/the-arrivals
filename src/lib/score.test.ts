import { describe, it, expect } from 'vitest'
import { rankParticipants, overallWinners } from './score'
import type { ParticipantRow } from './db-types'

const p = (id: string, name: string, score: number, joined: string): ParticipantRow => ({
  id,
  session_id: 's',
  name,
  score,
  joined_at: joined,
})

describe('score', () => {
  const parts = [p('a', 'Ann', 5, '1'), p('b', 'Bo', 5, '2'), p('c', 'Cy', 2, '3')]

  it('rangschikt op score, dan joined_at; gedeelde rang bij gelijke score', () => {
    const r = rankParticipants(parts)
    expect(r[0].id).toBe('a') // gelijke score, eerder gejoined
    expect(r[0].rank).toBe(1)
    expect(r[1].rank).toBe(1) // gedeelde rang
    expect(r[2].rank).toBe(3) // sprong na de twee gedeelde plekken
  })

  it('overall-winnaar(s): hoogste totaalscore', () => {
    const { winners, topScore } = overallWinners(parts)
    expect(topScore).toBe(5)
    expect(winners.map((w) => w.id)).toEqual(['a', 'b'])
  })

  it('geen winnaars bij score 0', () => {
    const { winners, topScore } = overallWinners([p('x', 'X', 0, '1')])
    expect(topScore).toBe(0)
    expect(winners).toHaveLength(0)
  })
})
