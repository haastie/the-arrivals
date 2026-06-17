import { describe, it, expect } from 'vitest'
import { countdownParts, tourStartMs } from './countdown'

describe('countdownParts', () => {
  it('splitst 1d 1u 1m 1s correct', () => {
    const p = countdownParts(90061000) // 1*86400 + 3661 s
    expect(p).toMatchObject({ done: false, days: 1, hours: 1, minutes: 1, seconds: 1 })
  })
  it('done bij 0 of negatief', () => {
    expect(countdownParts(0).done).toBe(true)
    expect(countdownParts(-5000).done).toBe(true)
    expect(countdownParts(-5000).total).toBe(0)
  })
})

describe('tourStartMs', () => {
  it('13:00 New York (EDT) = 17:00 UTC', () => {
    expect(tourStartMs('2026-06-21')).toBe(Date.parse('2026-06-21T17:00:00Z'))
  })
  it('null bij ongeldige datum', () => {
    expect(tourStartMs('niet-een-datum')).toBeNull()
  })
})
