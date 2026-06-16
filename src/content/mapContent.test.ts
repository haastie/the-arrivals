import { describe, it, expect } from 'vitest'
import { mapContent } from './mapContent'
import type { ContentRows } from './types'

const rows: ContentRows = {
  settings: {
    title: 'T', subtitle: 'S', language: 'nl', date: '2026-06-21', central_question: 'C',
    opening_line: 'O', closing_line: 'CL', warmup_intro: 'WI', mc_points: 1, open_points: 2, timeline_note: 'N',
  },
  stops: [
    { id: 's1', number: 1, name: 'Stop 1', optional: false, location: 'L', era: '1910s', layer: '1', food: null, intro: 'i', reveal: 'r', background: 'b', sort_order: 0 },
    { id: 's0', number: 0, name: 'Stop 0', optional: true, location: 'L', era: 'nu', layer: '0', food: 'Croissant', intro: 'i', reveal: 'r', background: 'b', sort_order: 1 },
  ],
  cards: [{ id: 'c1', title: 'Card', body: 'Body', sort_order: 0 }],
  questions: [
    { id: 'wu-q1', group_id: 'warmup', type: 'mc', prompt: 'P', options: ['a', 'b'], correct_index: 0, model_answer: null, points: 1, is_timeline: false, discussion: false, sort_order: 0, active: true },
    { id: 's1-q1', group_id: 's1', type: 'open', prompt: 'P2', options: null, correct_index: null, model_answer: 'M', points: 2, is_timeline: true, discussion: false, sort_order: 0, active: true },
    { id: 's1-q2', group_id: 's1', type: 'mc', prompt: 'inactief', options: ['x'], correct_index: 0, model_answer: null, points: 1, is_timeline: false, discussion: false, sort_order: 1, active: false },
  ],
  activities: [{ id: 'a1', stop_id: 's1', title: 'Act', body: 'AB', sort_order: 0 }],
}

describe('mapContent', () => {
  const c = mapContent(rows)
  it('stops gesorteerd op sort_order', () => {
    expect(c.stops.map((s) => s.id)).toEqual(['s1', 's0'])
  })
  it('warm-up vragen onder warmup', () => {
    expect(c.warmup.questions.map((q) => q.id)).toEqual(['wu-q1'])
    expect(c.warmup.intro).toBe('WI')
  })
  it('inactieve vragen worden weggelaten', () => {
    expect(c.stops[0].questions.map((q) => q.id)).toEqual(['s1-q1'])
  })
  it('activiteiten bij de juiste stop', () => {
    expect(c.stops[0].activities?.[0].id).toBe('a1')
  })
  it('timelineQuestionIds afgeleid', () => {
    expect(c.timelineQuestionIds).toEqual(['s1-q1'])
  })
  it('findQuestion en findActivity', () => {
    expect(c.findQuestion('s1-q1')?.stop?.id).toBe('s1')
    expect(c.findActivity('a1')?.stop.id).toBe('s1')
    expect(c.isActivityId('a1')).toBe(true)
    expect(c.isActivityId('s1-q1')).toBe(false)
  })
})
