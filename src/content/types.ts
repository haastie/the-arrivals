// Types for content_seed.json - de bron van waarheid voor alle tour-inhoud.

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
  /** Tour-onthulling - NIET tonen in de warm-up */
  reveal: string
  /** Achtergrondtekst - mag wél vooraf gelezen worden */
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
  /** v2: de herziene rode draad */
  redThread: string
  /** v2: de "zeef die zich herhaalt" (host-context) */
  mechanism: string
  openingLine: string
  /** v2: Lenape land acknowledgement */
  landAcknowledgement: string
  closingLine: string
  scoring: {
    mcPoints: number
    openPoints: number
  }
}

export interface Content {
  meta: Meta
  warmup: Warmup
  stops: Stop[]
}

// --- DB-rijen (zie supabase/migrations/0002_cms.sql) ---
export interface SettingsRow {
  title: string
  subtitle: string | null
  language: string | null
  date: string | null
  central_question: string | null
  red_thread: string | null
  mechanism: string | null
  land_acknowledgement: string | null
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

export interface RestaurantRow {
  id: string
  name: string
  community_id: string
  cuisine: string | null
  price: string | null
  address: string | null
  x: number
  y: number
  lat: number | null
  lng: number | null
  lang_group: string | null
  tour: number | null
  rating: number | null
  rating_count: number | null
  rating_source: string | null
  consensus: string | null
  dish: string | null
  dish_source: string | null
  quotes: { text: string; source: string }[] | null
  yelp_id: string | null
  source: string | null
  sort_order: number
  active: boolean
}

export interface ContentRows {
  settings: SettingsRow
  stops: StopRow[]
  cards: CardRow[]
  questions: QuestionRow[]
  activities: ActivityRow[]
  restaurants: RestaurantRow[]
}
