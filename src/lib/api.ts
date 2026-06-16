// Alle schrijfacties lopen via Postgres-RPC's (zie supabase/migrations/0001_init.sql).
import { supabase } from './supabase'
import type { Phase } from './db-types'

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

// --- Sessie aanmaken / joinen -------------------------------------------

export interface CreatedSession {
  id: string
  join_code: string
  host_secret: string
}

export async function createSession(): Promise<CreatedSession> {
  const { data, error } = await supabase.rpc('create_session')
  const rows = unwrap(data, error) as CreatedSession[]
  return rows[0]
}

export interface JoinedParticipant {
  id: string
  session_id: string
  name: string
  score: number
}

export async function joinSession(joinCode: string, name: string): Promise<JoinedParticipant> {
  const { data, error } = await supabase.rpc('join_session', {
    p_join_code: joinCode,
    p_name: name,
  })
  const rows = unwrap(data, error) as JoinedParticipant[]
  return rows[0]
}

// --- Antwoorden ----------------------------------------------------------
// (Warm-up scoort lokaal in de browser — geen DB-schrijfactie meer; zie warmupLocal.ts)

export async function submitLiveAnswer(args: {
  sessionId: string
  participantId: string
  questionId: string
  response: string
}) {
  const { error } = await supabase.rpc('submit_live_answer', {
    p_session_id: args.sessionId,
    p_participant_id: args.participantId,
    p_question_id: args.questionId,
    p_response: args.response,
  })
  if (error) throw new Error(error.message)
}

// --- Host-acties ---------------------------------------------------------

export async function hostSetPhase(sessionId: string, secret: string, phase: Phase) {
  const { error } = await supabase.rpc('host_set_phase', {
    p_session_id: sessionId,
    p_host_secret: secret,
    p_phase: phase,
  })
  if (error) throw new Error(error.message)
}

export async function hostPushQuestion(sessionId: string, secret: string, questionId: string) {
  const { error } = await supabase.rpc('host_push_question', {
    p_session_id: sessionId,
    p_host_secret: secret,
    p_question_id: questionId,
  })
  if (error) throw new Error(error.message)
}

export async function hostSetStatus(
  sessionId: string,
  secret: string,
  status: 'idle' | 'open' | 'locked' | 'revealed' | 'activity',
) {
  const { error } = await supabase.rpc('host_set_status', {
    p_session_id: sessionId,
    p_host_secret: secret,
    p_status: status,
  })
  if (error) throw new Error(error.message)
}

export async function hostPushActivity(sessionId: string, secret: string, activityId: string) {
  const { error } = await supabase.rpc('host_push_activity', {
    p_session_id: sessionId,
    p_host_secret: secret,
    p_activity_id: activityId,
  })
  if (error) throw new Error(error.message)
}

export async function hostClearActive(sessionId: string, secret: string) {
  const { error } = await supabase.rpc('host_clear_active', {
    p_session_id: sessionId,
    p_host_secret: secret,
  })
  if (error) throw new Error(error.message)
}

export async function hostRevealMc(args: { sessionId: string; secret: string; questionId: string }) {
  // correct_index + points worden server-side uit de questions-tabel gelezen.
  const { error } = await supabase.rpc('host_reveal_mc', {
    p_session_id: args.sessionId,
    p_host_secret: args.secret,
    p_question_id: args.questionId,
  })
  if (error) throw new Error(error.message)
}

export async function hostJudgeOpen(args: { answerId: string; secret: string; correct: boolean }) {
  // points wordt server-side uit de questions-tabel gelezen.
  const { error } = await supabase.rpc('host_judge_open', {
    p_answer_id: args.answerId,
    p_host_secret: args.secret,
    p_correct: args.correct,
  })
  if (error) throw new Error(error.message)
}

export async function hostAdjustPoints(args: {
  sessionId: string
  secret: string
  participantId: string
  delta: number
}) {
  const { error } = await supabase.rpc('host_adjust_points', {
    p_session_id: args.sessionId,
    p_host_secret: args.secret,
    p_participant_id: args.participantId,
    p_delta: args.delta,
  })
  if (error) throw new Error(error.message)
}
