import { useAudio } from './AudioProvider'

/**
 * Sfeer-knop: speelt het tour-nummer (Veintiuno - Momo) zodat deelnemers alvast
 * in de stemming komen. De audio leeft in de AudioProvider (boven de router) en
 * speelt door bij paginawissels.
 */
export function MusicButton({ className = '' }: { className?: string }) {
  const { playing, toggle } = useAudio()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? 'Muziek pauzeren' : 'Muziek afspelen'}
      className={`inline-flex items-center gap-2 rounded-full bg-paper/10 px-4 py-2 text-sm font-medium text-paper/90 transition hover:bg-paper/15 ${className}`}
    >
      <span className="text-base">{playing ? '⏸' : '▶'}</span>
      <span>{playing ? 'Muziek aan - Momo' : 'Zet de sfeer aan'}</span>
      {playing && (
        <span className="flex items-end gap-0.5" aria-hidden>
          <span className="h-3 w-0.5 animate-pulse rounded bg-amber-glow" />
          <span className="h-2 w-0.5 animate-pulse rounded bg-amber-glow [animation-delay:120ms]" />
          <span className="h-3.5 w-0.5 animate-pulse rounded bg-amber-glow [animation-delay:240ms]" />
        </span>
      )}
    </button>
  )
}
