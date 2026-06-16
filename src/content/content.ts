// Laadt content_seed.json (single source of truth) en biedt opzoek-helpers.
// De seed wordt in de JS-bundle gebakken, zodat de warm-up óók offline werkt.
import seed from '../../content_seed.json'
import type { Activity, Content, Question, Stop } from './types'

export const content = seed as Content
export const meta = content.meta
export const warmup = content.warmup
export const stops = content.stops
export const timelineQuestionIds = content.timelineQuestionIds

export interface QuestionLocation {
  question: Question
  /** Stop waar de vraag bij hoort; afwezig voor warm-up-vragen */
  stop?: Stop
  /** 'warmup' of de stop-id, voor groepering in de host-UI */
  groupId: string
  groupLabel: string
}

// Bouw eenmalig een index van alle vragen (warm-up + per stop).
const questionIndex = new Map<string, QuestionLocation>()

for (const q of warmup.questions) {
  questionIndex.set(q.id, {
    question: q,
    groupId: 'warmup',
    groupLabel: 'Warm-up',
  })
}
for (const stop of stops) {
  for (const q of stop.questions) {
    questionIndex.set(q.id, {
      question: q,
      stop,
      groupId: stop.id,
      groupLabel: `Stop ${stop.number} · ${stop.name}`,
    })
  }
}

export function findQuestion(id: string | null | undefined): QuestionLocation | undefined {
  if (!id) return undefined
  return questionIndex.get(id)
}

// Activiteiten (momo-blindtest, stilteminuut, eindstand) — gepusht via active_question_id.
const activityIndex = new Map<string, { activity: Activity; stop: Stop }>()
for (const stop of stops) {
  for (const act of stop.activities ?? []) {
    activityIndex.set(act.id, { activity: act, stop })
  }
}

/** Een actieve "vraag"-id kan in werkelijkheid een activiteitenkaart zijn. */
export function isActivityId(id: string | null | undefined): boolean {
  return !!id && activityIndex.has(id)
}

export function findActivity(id: string | null | undefined) {
  if (!id) return undefined
  return activityIndex.get(id)
}

export function isTimelineQuestion(id: string): boolean {
  return timelineQuestionIds.includes(id)
}

/** Stops die meetellen voor de host-vragenlijst (s0 heeft geen vragen). */
export const stopsWithQuestions = stops.filter((s) => s.questions.length > 0)
