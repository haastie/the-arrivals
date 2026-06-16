// Types for content_seed.json — de bron van waarheid voor alle tour-inhoud.

export type QuestionType = 'mc' | 'open'

export interface Question {
  id: string
  type: QuestionType
  prompt: string
  /** Alleen bij mc */
  options?: string[]
  /** Alleen bij mc */
  correctIndex?: number
  /** Alleen bij open: rubric voor de host */
  modelAnswer?: string
  points: number
  isTimeline?: boolean
  /** Alleen de slotvraag: tonen, niet scoren */
  discussion?: boolean
}

export interface Activity {
  id: string
  title: string
  body: string
}

export interface BackgroundCard {
  id: string
  title: string
  body: string
}

export interface Stop {
  id: string
  number: number
  name: string
  optional?: boolean
  location: string
  era: string
  layer: string
  food?: string
  intro: string
  /** Tour-onthulling — NIET tonen in de warm-up */
  reveal: string
  /** Achtergrondtekst — mag wél vooraf gelezen worden */
  background: string
  activities?: Activity[]
  questions: Question[]
}

export interface Warmup {
  intro: string
  backgroundCards: BackgroundCard[]
  questions: Question[]
}

export interface Meta {
  title: string
  subtitle: string
  language: string
  date: string
  centralQuestion: string
  openingLine: string
  closingLine: string
  scoring: {
    mcPoints: number
    openPoints: number
    timelineNote: string
  }
}

export interface Content {
  meta: Meta
  warmup: Warmup
  stops: Stop[]
  timelineQuestionIds: string[]
}
