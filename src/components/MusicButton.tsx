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
      className={`inline-flex items-center gap-2 rounded-full border border-paper/10 bg-paper/10 px-4 py-2 text-sm font-medium text-paper/90 backdrop-blur-sm transition duration-200 hover:bg-paper/15 active:scale-[0.97] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-glow" fill="currentColor" aria-hidden>
        {playing ? (
          <>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </>
        ) : (
          <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.5-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
        )}
      </svg>
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
