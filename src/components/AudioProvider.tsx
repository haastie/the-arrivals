import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface AudioState {
  playing: boolean
  toggle: () => void
}

const Ctx = createContext<AudioState | null>(null)

/**
 * Eén <audio>-element op het hoogste niveau (boven de router), zodat de muziek
 * blijft doorspelen bij het wisselen van pagina. preload="auto" buffert alvast
 * bij het laden van de app.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  // Buffer alvast zodra de app laadt.
  useEffect(() => {
    audioRef.current?.load()
  }, [])

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }

  return (
    <Ctx.Provider value={{ playing, toggle }}>
      <audio
        ref={audioRef}
        src="/music/veintiuno-momo.mp3"
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {children}
    </Ctx.Provider>
  )
}

export function useAudio(): AudioState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAudio buiten AudioProvider')
  return ctx
}
