import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AnswerRow, ParticipantRow, PublicSession } from '../lib/db-types'

const SESSION_COLS = 'id, join_code, phase, active_question_id, active_status, created_at'

export interface GameState {
  session: PublicSession | null
  participants: ParticipantRow[]
  answers: AnswerRow[]
  loading: boolean
  /** 'connecting' tot het kanaal voor het eerst SUBSCRIBED is; daarna 'live' of 'reconnecting'. */
  connection: 'connecting' | 'live' | 'reconnecting'
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Eén realtime bron van waarheid voor een sessie: de sessie-rij, deelnemers en
 * antwoorden. Robuust tegen korte verbindingsval — bij (her)verbinden, online-
 * worden of terug-focussen wordt de volledige state opnieuw geladen.
 */
export function useGameState(sessionId: string | null | undefined): GameState {
  const [session, setSession] = useState<PublicSession | null>(null)
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<GameState['connection']>('connecting')
  const [error, setError] = useState<string | null>(null)
  const everSubscribed = useRef(false)

  const refetch = useCallback(async () => {
    if (!sessionId) return
    try {
      const [s, p, a] = await Promise.all([
        supabase.from('sessions').select(SESSION_COLS).eq('id', sessionId).maybeSingle(),
        supabase.from('participants').select('*').eq('session_id', sessionId).order('joined_at'),
        supabase.from('answers').select('*').eq('session_id', sessionId),
      ])
      if (s.error) throw s.error
      if (p.error) throw p.error
      if (a.error) throw a.error
      setSession((s.data as PublicSession | null) ?? null)
      setParticipants((p.data as ParticipantRow[]) ?? [])
      setAnswers((a.data as AnswerRow[]) ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon sessie niet laden')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }
    setLoading(true)
    everSubscribed.current = false
    void refetch()

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          setSession(payload.new as PublicSession)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
        () => void refetch(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` },
        () => void refetch(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnection('live')
          // Bij herverbinden hebben we updates kunnen missen → volledige refetch.
          if (everSubscribed.current) void refetch()
          everSubscribed.current = true
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection(everSubscribed.current ? 'reconnecting' : 'connecting')
        }
      })

    // Herstel na korte onderbreking: opnieuw laden bij terugkeer.
    const onWake = () => void refetch()
    window.addEventListener('online', onWake)
    window.addEventListener('focus', onWake)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('online', onWake)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [sessionId, refetch])

  return { session, participants, answers, loading, connection, error, refetch }
}
