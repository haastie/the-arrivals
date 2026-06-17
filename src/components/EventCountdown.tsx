import { useEffect, useState } from 'react'
import { countdownParts, type CountdownParts } from '../lib/countdown'

/** Tikt elke seconde; geeft de resterende tijd t.o.v. `target` (ms). */
export function useCountdown(target: number | null): CountdownParts {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (target === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  return countdownParts(target === null ? 0 : target - now)
}

const pad = (n: number) => String(n).padStart(2, '0')

function Segment({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-3xl font-semibold tabular-nums text-paper tracking-tight">
        {pad(value)}
      </span>
      <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-paper/45 uppercase">
        {label}
      </span>
    </div>
  )
}

/**
 * Vertrekbord-aftelklok naar de start van de tour. Toont de afspraak (tijd,
 * metrostation, lege maag) en telt af; na de start verschijnt een "we zijn
 * begonnen"-boodschap.
 */
export function EventCountdown({
  parts,
  station = '90 St-Elmhurst Av',
  time = '13:00',
}: {
  parts: CountdownParts
  station?: string
  time?: string
}) {
  return (
    <div className="rounded-3xl border border-paper/10 bg-paper/5 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.18em] text-amber-glow/85 uppercase">
          <span className={`h-1.5 w-1.5 rounded-full bg-amber-glow ${parts.done ? '' : 'animate-pulse'}`} />
          {parts.done ? 'Nu vertrokken' : 'Vertrek over'}
        </span>
        <span className="font-mono text-[11px] tracking-[0.12em] text-paper/55 uppercase">
          {time} · 7-trein
        </span>
      </div>

      {parts.done ? (
        <p className="font-display mt-3 text-xl leading-snug font-bold text-paper">
          We zijn begonnen - kom naar {station}.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-1">
          <Segment value={parts.days} label="dagen" />
          <Segment value={parts.hours} label="uur" />
          <Segment value={parts.minutes} label="min" />
          <Segment value={parts.seconds} label="sec" />
        </div>
      )}

      <p className="mt-4 border-t border-paper/10 pt-3 text-sm leading-relaxed text-paper/65">
        We verzamelen om <span className="font-semibold text-paper">{time}</span> bij metrostation{' '}
        <span className="font-semibold text-paper">{station}</span> - kom op een{' '}
        <span className="font-semibold text-amber-glow">lege maag</span>.
      </p>
    </div>
  )
}
