import { Link, useSearchParams } from 'react-router-dom'
import { useContentState } from '../content/content'
import { Button, MultilingualGreeting, Screen, Tag } from '../components/ui'
import { MusicButton } from '../components/MusicButton'
import { EventCountdown, useCountdown } from '../components/EventCountdown'
import { tourStartMs } from '../lib/countdown'

export default function Landing() {
  const { content } = useContentState()
  const [params] = useSearchParams()
  const meta = content?.meta
  const target = tourStartMs(meta?.date ?? '2026-06-21')
  const cd = useCountdown(target)
  // ?preview ontgrendelt 'Doe mee' om de tour vóór de startdatum te testen.
  const previewUnlock = params.has('preview')
  const locked = target !== null && !cd.done && !previewUnlock

  return (
    <Screen className="justify-between">
      <div className="ta-rise pt-10">
        <MultilingualGreeting />
        <h1 className="font-display mt-5 bg-gradient-to-br from-paper via-paper to-amber-200 bg-clip-text text-5xl leading-[1.02] font-bold text-transparent">
          {meta?.title ?? 'The Arrivals'}
        </h1>
        <p className="mt-4 text-lg leading-snug text-paper/70">
          {meta?.subtitle ?? 'Een quiz-wandeling door honderd jaar migratie'}
        </p>

        {meta?.redThread && (
          <p className="mt-6 font-mono text-[11px] tracking-[0.16em] text-sky-live/90 uppercase">
            {meta.redThread}
          </p>
        )}

        {meta?.openingLine && (
          <p className="font-display mt-4 border-l-2 border-amber-glow/70 pl-4 text-lg leading-relaxed text-paper/85 italic">
            {meta.openingLine}
          </p>
        )}

        {meta?.landAcknowledgement && (
          <p className="mt-4 pl-4 text-xs leading-relaxed text-paper/45">
            {meta.landAcknowledgement}
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <EventCountdown parts={cd} />

        {locked ? (
          <div>
            <Button block disabled>
              Doe mee opent om 13:00
            </Button>
            <p className="mt-1.5 text-center text-xs text-paper/40">
              De groepswandeling start bij 90 St-Elmhurst Av.
            </p>
          </div>
        ) : (
          <div>
            <Link to="/join">
              <Button block>Doe mee</Button>
            </Link>
            {previewUnlock && target !== null && !cd.done && (
              <p className="mt-1.5 text-center font-mono text-[11px] tracking-[0.14em] text-sky-live/80 uppercase">
                Testmodus · knop ontgrendeld
              </p>
            )}
          </div>
        )}
        <Link to="/warmup">
          <Button variant="secondary" block>
            Thuis oefenen (warm-up)
          </Button>
        </Link>
        {meta?.date && (
          <div className="mt-1 flex justify-center">
            <Tag>Jackson Heights, Queens · {meta.date}</Tag>
          </div>
        )}
        <div className="mt-1 flex justify-center">
          <MusicButton />
        </div>
      </div>
    </Screen>
  )
}
