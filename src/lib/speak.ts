/**
 * Spreekt tekst uit via de Web Speech API (browser-TTS). Stil falen als de
 * browser geen speechSynthesis heeft. `lang` bv. 'es-MX', 'hi-IN'.
 */
export function speak(text: string, lang?: string): void {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    if (lang) u.lang = lang
    u.rate = 0.88
    synth.speak(u)
  } catch {
    /* TTS niet beschikbaar - negeer */
  }
}

export const speechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window
