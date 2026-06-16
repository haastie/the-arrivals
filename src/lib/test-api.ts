import { supabase } from './supabase'

export async function addTestParticipant(sessionId: string, secret: string, name: string) {
  const { error } = await supabase.rpc('add_test_participant', {
    p_session_id: sessionId,
    p_host_secret: secret,
    p_name: name,
  })
  if (error) throw new Error(error.message)
}

export async function simulateAnswers(sessionId: string, secret: string, questionId: string) {
  const { error } = await supabase.rpc('simulate_answers', {
    p_session_id: sessionId,
    p_host_secret: secret,
    p_question_id: questionId,
  })
  if (error) throw new Error(error.message)
}
