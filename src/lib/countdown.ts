export interface CountdownParts {
  done: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
  /** Resterende milliseconden (>= 0). */
  total: number
}

/** Splitst de resterende milliseconden in dagen/uren/minuten/seconden. Puur. */
export function countdownParts(msRemaining: number): CountdownParts {
  const done = msRemaining <= 0
  const total = Math.max(0, msRemaining)
  const s = Math.floor(total / 1000)
  return {
    done,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    total,
  }
}

/**
 * Doeltijdstip van de tour als UNIX-ms: het meta-datum (YYYY-MM-DD) om 13:00 in
 * New York (EDT, UTC-4 in juni). Geeft null bij een ongeldig datum.
 */
export function tourStartMs(eventDate: string, time = '13:00', tzOffset = '-04:00'): number | null {
  const t = new Date(`${eventDate}T${time}:00${tzOffset}`).getTime()
  return Number.isNaN(t) ? null : t
}
