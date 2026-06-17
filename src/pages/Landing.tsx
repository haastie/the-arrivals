import { Link } from 'react-router-dom'
import { useContentState } from '../content/content'
import { Button, MultilingualGreeting, Screen } from '../components/ui'
import { MusicButton } from '../components/MusicButton'

export default function Landing() {
  const { content } = useContentState()
  const meta = content?.meta

  return (
    <Screen className="justify-between">
      <div className="ta-rise pt-8">
        <MultilingualGreeting />
        <h1 className="font-display mt-4 text-4xl leading-[1.05] font-bold text-paper">
          {meta?.title ?? 'The Arrivals'}
        </h1>
        <p className="mt-3 text-lg text-paper/70">
          {meta?.subtitle ?? 'Een quiz-wandeling door honderd jaar migratie'}
        </p>

        {meta?.openingLine && (
          <p className="mt-8 border-l-2 border-amber-glow/60 pl-4 text-base leading-relaxed text-paper/80">
            {meta.openingLine}
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <Link to="/join">
          <Button block>Doe mee</Button>
        </Link>
        <Link to="/warmup">
          <Button variant="secondary" block>
            Thuis oefenen (warm-up)
          </Button>
        </Link>
        {meta?.date && (
          <p className="text-center text-xs text-paper/40">Jackson Heights, Queens · {meta.date}</p>
        )}
        <div className="mt-1 flex justify-center">
          <MusicButton />
        </div>
      </div>
    </Screen>
  )
}
