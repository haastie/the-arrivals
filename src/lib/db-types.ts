// Rij-types die de Supabase-tabellen spiegelen (zie supabase/migrations/0001_init.sql).

export type Phase = 'warmup' | 'live' | 'finished'
export type ActiveStatus = 'idle' | 'open' | 'locked' | 'revealed' | 'activity'
export type AnswerStatus = 'pending' | 'correct' | 'incorrect'

export interface SessionRow {
  id: string
  join_code: string
  host_secret: string
  phase: Phase
  active_question_id: string | null
  active_status: ActiveStatus
  created_at: string
}

/** Wat een deelnemer mag zien van de sessie (zonder host_secret). */
export type PublicSession = Omit<SessionRow, 'host_secret'>

export interface ParticipantRow {
  id: string
  session_id: string
  name: string
  score: number
  joined_at: string
}

export interface AnswerRow {
  id: string
  session_id: string
  participant_id: string
  question_id: string
  response: string | null
  status: AnswerStatus
  awarded_points: number
  created_at: string
}
