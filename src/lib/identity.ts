// Lichte client-side identiteit. Geen accounts: een deelnemer is een naam +
// participant-id per sessie; een host bewaart het host_secret per sessie.

export interface ParticipantIdentity {
  participantId: string
  sessionId: string
  name: string
}

const PARTICIPANT_KEY = 'ta_participant'

export function saveParticipant(id: ParticipantIdentity) {
  localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(id))
}

export function loadParticipant(): ParticipantIdentity | null {
  try {
    const raw = localStorage.getItem(PARTICIPANT_KEY)
    return raw ? (JSON.parse(raw) as ParticipantIdentity) : null
  } catch {
    return null
  }
}

export function clearParticipant() {
  localStorage.removeItem(PARTICIPANT_KEY)
}

// --- Host ---------------------------------------------------------------

function hostKey(sessionId: string) {
  return `ta_host_${sessionId}`
}

export function saveHostSecret(sessionId: string, secret: string) {
  localStorage.setItem(hostKey(sessionId), secret)
  localStorage.setItem('ta_host_last', sessionId)
}

export function loadHostSecret(sessionId: string): string | null {
  return localStorage.getItem(hostKey(sessionId))
}

/** De laatst aangemaakte sessie van deze host (voor terugkeren naar /master). */
export function loadLastHostSession(): { sessionId: string; secret: string } | null {
  const sessionId = localStorage.getItem('ta_host_last')
  if (!sessionId) return null
  const secret = loadHostSecret(sessionId)
  if (!secret) return null
  return { sessionId, secret }
}
