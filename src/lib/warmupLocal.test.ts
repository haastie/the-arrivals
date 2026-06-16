import { describe, it, expect, beforeEach } from 'vitest'

// minimal localStorage shim voor de node-omgeving
const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => {
    delete store[k]
  },
  clear: () => {
    for (const k in store) delete store[k]
  },
  key: () => null,
  length: 0,
} as Storage

import { loadProgress, recordAnswer, clearProgress } from './warmupLocal'

beforeEach(() => clearProgress())

describe('warmupLocal', () => {
  it('slaat een mc-antwoord op met correctheid', () => {
    recordAnswer({ questionId: 'wu-q1', response: '0', correct: true, points: 1 })
    const p = loadProgress()
    expect(p['wu-q1']).toEqual({ response: '0', correct: true, points: 1 })
  })
  it('overschrijft niet bij tweede poging (oefenen = eenmalig vastgezet)', () => {
    recordAnswer({ questionId: 'wu-q1', response: '0', correct: true, points: 1 })
    recordAnswer({ questionId: 'wu-q1', response: '1', correct: false, points: 1 })
    expect(loadProgress()['wu-q1'].correct).toBe(true)
  })
})
