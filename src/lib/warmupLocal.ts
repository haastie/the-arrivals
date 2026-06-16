// Lokale, niet-tellende warm-up-voortgang (puur oefenen — geen DB, geen leaderboard).
export interface LocalAnswer {
  response: string
  correct: boolean
  points: number
}
export type WarmupProgress = Record<string, LocalAnswer>

const KEY = 'ta_warmup_progress'

export function loadProgress(): WarmupProgress {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as WarmupProgress
  } catch {
    return {}
  }
}

export function recordAnswer(a: LocalAnswer & { questionId: string }): WarmupProgress {
  const p = loadProgress()
  if (p[a.questionId]) return p // eenmaal vastgezet
  p[a.questionId] = { response: a.response, correct: a.correct, points: a.points }
  localStorage.setItem(KEY, JSON.stringify(p))
  return p
}

export function clearProgress() {
  localStorage.removeItem(KEY)
}
