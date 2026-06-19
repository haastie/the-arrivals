import { describe, it, expect } from 'vitest'
import { PHRASE_GROUPS, phraseGroupById, dishPhrase, type Restaurant } from './jacksonHeightsMap'

describe('PHRASE_GROUPS', () => {
  it('elke groep en elke zin/gerecht is goed gevormd', () => {
    for (const g of PHRASE_GROUPS) {
      expect(g.id).toBeTruthy()
      expect(g.ttsLang).toBeTruthy()
      expect(typeof g.roman).toBe('boolean')
      expect(g.phrases.length).toBeGreaterThan(0)
      for (const p of [...g.phrases, ...g.foods]) {
        expect(p.en).toBeTruthy()
        expect(p.native).toBeTruthy()
        expect(p.roman).toBeTruthy()
      }
    }
  })

  it('bevat een Mandarijn-groep met zh-CN stem', () => {
    expect(phraseGroupById['mandarin']).toBeTruthy()
    expect(phraseGroupById['mandarin'].ttsLang).toBe('zh-CN')
  })
})

describe('dishPhrase', () => {
  const base: Restaurant = {
    id: 'x', name: 'X', communityId: 'south_asian', cuisine: '', price: '', address: '',
    x: 0, y: 0, langGroup: 'hindi', tour: 0, rating: 0, ratingCount: 0, ratingSource: '',
    consensus: '', dish: 'Chicken biryani', dishSource: '', quotes: [],
  }
  it('koppelt het gerecht aan een foods-item van de taalgroep', () => {
    const dp = dishPhrase(base)
    expect(dp?.food.roman.toLowerCase()).toContain('biryani')
  })
  it('matcht ook bij omgekeerde woordvolgorde (Spaans)', () => {
    const dp = dishPhrase({ ...base, langGroup: 'spanish', dish: 'Brasa pollo especial' })
    expect(dp?.food.native).toBe('Pollo a la brasa')
  })
  it('geen valse match op een generiek woord (kip)', () => {
    const dp = dishPhrase({ ...base, langGroup: 'spanish', dish: 'Gegrilde kip' })
    expect(dp).toBeNull()
  })
  it('geeft null als de zaak geen taalgroep heeft', () => {
    expect(dishPhrase({ ...base, langGroup: null })).toBeNull()
  })
})
