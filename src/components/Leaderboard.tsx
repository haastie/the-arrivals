import { rankParticipants } from '../lib/score'
import type { ParticipantRow } from '../lib/db-types'

const medal = ['🥇', '🥈', '🥉']

export function Leaderboard({
  participants,
  highlightId,
  compact = false,
}: {
  participants: ParticipantRow[]
  highlightId?: string
  compact?: boolean
}) {
  const ranked = rankParticipants(participants)

  if (ranked.length === 0) {
    return <p className="text-sm text-ink/50">Nog geen deelnemers.</p>
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {ranked.map((p) => {
        const isMe = p.id === highlightId
        return (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl px-3 ${compact ? 'py-1.5' : 'py-2.5'} ${
              isMe ? 'bg-amber-glow/25 ring-1 ring-amber-glow' : 'bg-ink/5'
            }`}
          >
            <span className="w-7 shrink-0 text-center text-base font-bold tabular-nums text-ink/70">
              {p.rank <= 3 ? medal[p.rank - 1] : p.rank}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">
              {p.name}
              {isMe && <span className="ml-1 text-xs font-normal text-ink/50">(jij)</span>}
            </span>
            <span className="shrink-0 text-lg font-bold tabular-nums text-clay">{p.score}</span>
          </li>
        )
      })}
    </ol>
  )
}
