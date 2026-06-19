import { Card } from '../ui'
import { SpeakButton } from './SpeakButton'
import { PHRASE_GROUPS, phraseGroupById } from '../../data/jacksonHeightsMap'

/** Taalgids: zinnen en gerechtnamen per taal, met voorlezen. */
export function Phrasebook({
  phraseId,
  onSetPhrase,
}: {
  phraseId: string
  onSetPhrase: (id: string) => void
}) {
  const group = phraseGroupById[phraseId] ?? PHRASE_GROUPS[0]
  const say = (native: string, roman: string) => (group.roman ? roman : native)

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-[10px] font-bold tracking-[0.12em] text-clay uppercase">03 · Spreek de buurt</p>
        <p className="mt-1 text-sm text-ink/60">
          Bestel in de talen van Roosevelt Ave. Tik op de luidspreker om een zin te horen, of open een
          pin voor de eigen zin van een zaak.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PHRASE_GROUPS.map((g) => {
          const on = g.id === phraseId
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSetPhrase(g.id)}
              className={`flex shrink-0 flex-col items-start gap-0.5 rounded-2xl border px-3 py-2 transition ${
                on ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-ink/5 text-ink hover:border-ink/40'
              }`}
            >
              <span className="text-base leading-none font-bold">{g.tab}</span>
              <span className="text-[9px] font-bold tracking-wider uppercase opacity-80">{g.label}</span>
            </button>
          )
        })}
      </div>

      <p className="-mt-1 text-xs text-ink/45">{group.flag}</p>

      <div>
        <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-ink/45 uppercase">Bestellen</p>
        <div className="flex flex-col gap-2">
          {group.phrases.map((ph) => (
            <div
              key={ph.en}
              className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-ink/5 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink/55">{ph.en}</p>
                <p className="text-base leading-tight font-bold text-ink">{ph.native}</p>
                <p className="text-xs text-ink/55 italic">{ph.roman}</p>
              </div>
              <SpeakButton text={say(ph.native, ph.roman)} lang={group.ttsLang} size={32} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-ink/45 uppercase">Op het menu</p>
        <div className="flex flex-wrap gap-2">
          {group.foods.map((f) => (
            <div
              key={f.en}
              className="flex flex-col items-start rounded-xl border border-ink/10 bg-ink/5 px-3 py-2"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-ink">{f.native}</span>
                <SpeakButton text={say(f.native, f.roman)} lang={group.ttsLang} size={22} />
              </span>
              <span className="text-[11px] text-ink/55">{f.en}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
