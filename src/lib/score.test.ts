import { describe, it, expect } from 'vitest'
import { rankParticipants, timelineWinners } from './score'
import type { AnswerRow, ParticipantRow } from './db-types'

const p = (id: string, name: string, score: number, joined: string): ParticipantRow => ({
  id,
  session_id: 's',
  name,
  score,
  joined_at: joined,
})
const a = (pid: string, qid: string, pts: number): AnswerRow => ({
  id: pid + qid,
  session_id: 's',
  participant_id: pid,
  question_id: qid,
  response: '0',
  status: 'correct',
  awarded_points: pts,
  created_at: '',
})

describe('score', () => {
  const parts = [p('a', 'Ann', 5, '1'), p('b', 'Bo', 5, '2'), p('c', 'Cy', 2, '3')]
  const answers = [a('a', 's1-q1', 2), a('b', 's8-q1', 1)]
  const tl = ['s1-q1', 's8-q1']

  it('rangschikt op score, dan timeline, dan joined', () => {
    const r = rankParticipants(parts, answers, tl)
    expect(r[0].id).toBe('a') // gelijke score, hogere timeline
    expect(r[0].rank).toBe(1)
    expect(r[1].rank).toBe(1) // gedeelde rang
  })

  it('timeline-winnaar', () => {
    const { winners, topScore } = timelineWinners(parts, answers, tl)
    expect(topScore).toBe(2)
    expect(winners.map((w) => w.id)).toEqual(['a'])
  })
})
