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

// --- DB-rijen (zie supabase/migrations/0002_cms.sql) ---
export interface SettingsRow {
  title: string
  subtitle: string | null
  language: string | null
  date: string | null
  central_question: string | null
  opening_line: string | null
  closing_line: string | null
  warmup_intro: string | null
  mc_points: number
  open_points: number
  timeline_note: string | null
}
export interface StopRow {
  id: string
  number: number
  name: string
  optional: boolean
  location: string | null
  era: string | null
  layer: string | null
  food: string | null
  intro: string | null
  reveal: string | null
  background: string | null
  sort_order: number
}
export interface CardRow {
  id: string
  title: string
  body: string
  sort_order: number
}
export interface QuestionRow {
  id: string
  group_id: string
  type: 'mc' | 'open'
  prompt: string
  options: string[] | null
  correct_index: number | null
  model_answer: string | null
  points: number
  is_timeline: boolean
  discussion: boolean
  sort_order: number
  active: boolean
}
export interface ActivityRow {
  id: string
  stop_id: string
  title: string
  body: string
  sort_order: number
}

export interface ContentRows {
  settings: SettingsRow
  stops: StopRow[]
  cards: CardRow[]
  questions: QuestionRow[]
  activities: ActivityRow[]
}
