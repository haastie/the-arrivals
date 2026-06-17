import { Link } from 'react-router-dom'
import { useContentState } from '../content/content'
import { Button, MultilingualGreeting, Screen, Tag } from '../components/ui'
import { MusicButton } from '../components/MusicButton'

export default function Landing() {
  const { content } = useContentState()
  const meta = content?.meta

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

        {meta?.openingLine && (
          <p className="font-display mt-8 border-l-2 border-amber-glow/70 pl-4 text-lg leading-relaxed text-paper/85 italic">
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
