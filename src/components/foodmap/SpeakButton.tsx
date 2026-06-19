import { speak } from '../../lib/speak'

/** Ronde knop die tekst voorleest (Web Speech). */
export function SpeakButton({
  text,
  lang,
  size = 32,
  className = '',
}: {
  text: string
  lang?: string
  size?: number
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => speak(text, lang)}
      aria-label={`Spreek uit: ${text}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-ink/15 bg-ink/5 text-ink transition active:scale-90 hover:bg-ink/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path
          d="M15.5 8.5a4 4 0 0 1 0 7M18 6a7 7 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
