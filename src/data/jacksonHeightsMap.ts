// Data voor de "Jackson Heights" eten- & taalkaart.
// Gebaseerd op het Claude-Design-ontwerp "Jackson Heights Map".
// Ratings/quotes zijn samengevat uit publieke bronnen (Yelp, Tripadvisor,
// The Infatuation, Gothamist, Untapped New York, Google).

export interface Community {
  id: string
  label: string
  sub: string
  color: string
}

export interface Zone {
  cx: number
  cy: number
  rx: number
  ry: number
}

export interface Quote {
  text: string
  source: string
}

export interface Restaurant {
  id: string
  name: string
  communityId: string
  cuisine: string
  price: string
  address: string
  /** Positie op de gestileerde kaart (0-100%) - fallback als lat/lng ontbreekt. */
  x: number
  y: number
  /** Echte coördinaten (gescrapet); anders afgeleid uit x/y. */
  lat?: number
  lng?: number
  langGroup: string
  tour: number
  rating: number
  ratingCount: number
  ratingSource: string
  consensus: string
  dish: string
  dishSource: string
  quotes: Quote[]
}

export interface Phrase {
  en: string
  native: string
  roman: string
}

export interface PhraseGroup {
  id: string
  tab: string
  label: string
  flag: string
  /** Taalcode voor Web Speech (TTS). */
  ttsLang: string
  /** True = spreek de geromaniseerde versie uit i.p.v. native (bv. Tibetaans). */
  roman: boolean
  phrases: Phrase[]
  foods: Phrase[]
}

export const COMMUNITIES: Community[] = [
  { id: 'south_asian', label: 'South Asian', sub: 'Indiaas · Bengaals · Pakistaans', color: '#E0820B' },
  { id: 'himalayan', label: 'Himalayan', sub: 'Nepalees · Tibetaans', color: '#C5362B' },
  { id: 'colombian', label: 'Colombiaans', sub: 'La Pequeña Colombia', color: '#D89A00' },
  { id: 'mexican', label: 'Mexicaans', sub: 'Taquerías & cantinas', color: '#1E8A5B' },
  { id: 'ecuadorian', label: 'Ecuadoriaans', sub: 'Kust- & sierrakeuken', color: '#2563C9' },
  { id: 'lgbtq', label: 'LGBTQ+ erfgoed', sub: 'Bakermat van Queens Pride', color: '#D6336C' },
  { id: 'other', label: 'Overig', sub: 'Amerikaans & internationaal', color: '#64748B' },
]

export const ZONES: Record<string, Zone> = {
  south_asian: { cx: 30, cy: 57, rx: 13, ry: 13 },
  himalayan: { cx: 28, cy: 69, rx: 11, ry: 12 },
  colombian: { cx: 61, cy: 79, rx: 14, ry: 8 },
  mexican: { cx: 44, cy: 80, rx: 11, ry: 7 },
  ecuadorian: { cx: 68, cy: 81, rx: 12, ry: 7 },
  lgbtq: { cx: 45, cy: 83, rx: 9, ry: 5 },
}

export const RESTAURANTS: Restaurant[] = [
  { id: 'rajbhog', name: 'Rajbhog Sweets', communityId: 'south_asian', cuisine: 'Gujarati · Veg', price: '$', address: '72-27 37th Ave', x: 25, y: 50, langGroup: 'hindi', tour: 1, rating: 4.2, ratingCount: 300, ratingSource: 'Google', consensus: 'Zuid-Gujarati snacks, dampende dhokla en een betaalbare thali op de 37th Avenue-strip.', dish: 'Gujarati thali', dishSource: 'Vaste klanten', quotes: [{ text: 'Verse dhokla en een thali die de tafel vult.', source: 'Google-reviewer' }, { text: 'Betrouwbare snoepbalie als de festivals eraan komen.', source: 'Buurtbewoner' }] },
  { id: 'samudra', name: 'Samudra', communityId: 'south_asian', cuisine: 'Zuid-Indiaas · Veg', price: '$', address: '75-18 37th Ave', x: 34, y: 52, langGroup: 'hindi', tour: 2, rating: 4.1, ratingCount: 235, ratingSource: 'Restaurantji', consensus: 'Een rustig vegetarisch pareltje - knapperige dosas en paneer uthappam, met zachte Bollywood-oldies.', dish: 'Paper dosa', dishSource: 'Restaurantji', quotes: [{ text: 'Knapperig, lekker, vers gemaakt.', source: 'Restaurantji' }, { text: 'Het is essentieel om een dosa te bestellen.', source: 'Untapped New York' }] },
  { id: 'jackson_diner', name: 'Jackson Diner', communityId: 'south_asian', cuisine: 'Noord-Indiaas', price: '$$', address: '37-47 74th St', x: 30, y: 55, langGroup: 'hindi', tour: 3, rating: 4.0, ratingCount: 724, ratingSource: 'Yelp', consensus: 'Een Little India-instituut sinds 1980 - groot, groepsvriendelijk, geliefd om gulle biryani en butter chicken.', dish: 'Chicken biryani', dishSource: 'The Infatuation', quotes: [{ text: 'Topkwaliteit, en grotere porties dan de rest van de buurt.', source: 'Yelp-reviewer' }, { text: 'Ideaal om biryani te delen met een grote groep.', source: 'The Infatuation' }] },
  { id: 'maharaja', name: 'Maharaja Sweets & Snacks', communityId: 'south_asian', cuisine: 'Zoet · Chaat', price: '$', address: '73-10 37th Rd', x: 27, y: 63, langGroup: 'hindi', tour: 4, rating: 4.3, ratingCount: 410, ratingSource: 'Google', consensus: 'Vitrines vol mithai vooraan, een bruisende chaat-balie achterin - de zoet-en-pittig-stop bij Diversity Plaza.', dish: 'Samosa chaat', dishSource: 'Untapped New York', quotes: [{ text: 'Gulab jamun waar je meer van wilt.', source: 'Untapped New York' }, { text: 'Betaalbare snacks en zoetigheid, altijd vol.', source: 'Google-reviewer' }] },
  { id: 'mustang', name: 'Mustang Thakali Kitchen', communityId: 'himalayan', cuisine: 'Nepalees', price: '$$', address: '74-14 37th Rd', x: 30, y: 66, langGroup: 'nepali', tour: 5, rating: 4.4, ratingCount: 180, ratingSource: 'Google', consensus: 'Thakali-sets uit de bergvalleien van Nepal - zwarte bonen, gefermenteerde gundruk en rijst in ghee.', dish: 'Thakali thali', dishSource: 'Vaste klanten', quotes: [{ text: 'De meest authentieke Thakali-set in de buurt.', source: 'Google-reviewer' }, { text: 'Gul, huiselijk en betaalbaar.', source: 'Buurtbewoner' }] },
  { id: 'lhasa', name: 'Lhasa Fast Food', communityId: 'himalayan', cuisine: 'Tibetaans', price: '$', address: '37-50 74th St', x: 31, y: 60, langGroup: 'tibetan', tour: 6, rating: 4.6, ratingCount: 89, ratingSource: 'Tripadvisor', consensus: 'Een piepklein zaaltje met vijf tafels achter een telefoonwinkel - stilletjes de beste momos van de buurt.', dish: 'Momos met rund & bieslook', dishSource: 'The Infatuation', quotes: [{ text: 'Een van de beste dumplings van de hele buurt.', source: 'The Infatuation' }, { text: 'Sappig, mals, ontzettend smaakvol.', source: 'Tripadvisor-reviewer' }] },
  { id: 'phayul', name: 'Phayul', communityId: 'himalayan', cuisine: 'Tibetaans', price: '$$', address: '37-65 74th St', x: 34, y: 61, langGroup: 'tibetan', tour: 7, rating: 4.5, ratingCount: 260, ratingSource: 'Tripadvisor', consensus: 'Een verborgen trap op: een langer menu met vurige Tibetaanse roerbakgerechten dat sommigen boven Lhasa zetten.', dish: 'Beef shapta', dishSource: 'The Infatuation', quotes: [{ text: 'Zo goed als we Lhasa vinden, dit is nog beter.', source: 'The Infatuation' }, { text: 'Authentieke smaken in een verborgen pareltje.', source: 'Tripadvisor-reviewer' }] },
  { id: 'himalayan_yak', name: 'Himalayan Yak', communityId: 'himalayan', cuisine: 'Nepalees · Tibetaans', price: '$$', address: '72-20 Roosevelt Ave', x: 24, y: 75, langGroup: 'nepali', tour: 8, rating: 4.3, ratingCount: 520, ratingSource: 'Google', consensus: 'Een ruime eetzaal met houtsnijwerk voor complete Nepalese thali-sets, yak-bottensoep en momos bij het dozijn.', dish: 'Nepalese thali-set', dishSource: 'Gothamist', quotes: [{ text: 'Echt goed Nepalees eten - de momos zijn het wachten waard.', source: 'Yelp-reviewer' }, { text: 'Zit-restaurant voor thali en botertee.', source: 'Google-reviewer' }] },
  { id: 'music_box', name: 'Music Box', communityId: 'lgbtq', cuisine: 'Nachtleven', price: '$$', address: '40-08 74th St', x: 34, y: 71, langGroup: 'spanish', tour: 9, rating: 4.2, ratingCount: 120, ratingSource: 'Google', consensus: 'Een lang draaiende queer Latin-clubavond waar cumbia de ballroom-vloer ontmoet, net naast 74th Street.', dish: 'Cumbia & vogue-avond', dishSource: 'Buurtverhaal', quotes: [{ text: 'Zweterig, vrolijk en onmiskenbaar Queens.', source: 'Vaste gast' }, { text: 'Latin-nachtleven met een vogue-twist.', source: 'Buurtverhaal' }] },
  { id: 'coatzingo', name: 'Taqueria Coatzingo', communityId: 'mexican', cuisine: 'Mexicaans', price: '$', address: '76-05 Roosevelt Ave', x: 39, y: 81, langGroup: 'spanish', tour: 10, rating: 4.2, ratingCount: 1600, ratingSource: 'Google', consensus: 'De oudste en grootste van de Mexicaanse keukens in de buurt - door en door Puebla, met geitenbarbacoa in het weekend.', dish: 'Geitenbarbacoa (weekend)', dishSource: 'Gothamist', quotes: [{ text: 'De oudste en grootste Mexicaan van Jackson Heights.', source: 'Gothamist' }, { text: 'Door en door Puebla - chicharrón in salsa verde.', source: 'Gothamist' }] },
  { id: 'arepa_lady', name: 'Arepa Lady', communityId: 'colombian', cuisine: 'Colombiaans', price: '$', address: '77-02 Roosevelt Ave', x: 42, y: 76, langGroup: 'spanish', tour: 11, rating: 4.3, ratingCount: 321, ratingSource: 'Restaurantji', consensus: 'María Cano’s legendarische Roosevelt Ave-bakplaat, nu een winkelpui - zoete maïsarepas onder een deken van kaas.', dish: 'Arepa de choclo', dishSource: 'Restaurantji', quotes: [{ text: 'Behield de authentieke Zuid-Amerikaanse straatstijl.', source: 'Yelp-reviewer' }, { text: 'Wat een geweldige maaltijd - we komen terug.', source: 'Restaurantji' }] },
  { id: 'friends', name: 'Friends Tavern', communityId: 'lgbtq', cuisine: 'Bar · Latin', price: '$$', address: '78-11 Roosevelt Ave', x: 49, y: 85, langGroup: 'spanish', tour: 12, rating: 4.4, ratingCount: 300, ratingSource: 'Google', consensus: 'Open sinds 1978 - de langstlopende gay Latino-bar van Queens en hoeksteen van de eerste migrant-geleide Pride.', dish: 'Een koud biertje & decennia geschiedenis', dishSource: 'Buurtverhaal', quotes: [{ text: 'Een instituut van het Latijns LGBTQ+-nachtleven in Queens.', source: 'Buurtverhaal' }, { text: 'Iedereen welkom - de geschiedenis leeft op deze muren.', source: 'Vaste gast' }] },
  { id: 'birria', name: 'Birria-Landia', communityId: 'mexican', cuisine: 'Mexicaans', price: '$', address: '78-14 Roosevelt Ave', x: 46, y: 81, langGroup: 'spanish', tour: 13, rating: 4.6, ratingCount: 1500, ratingSource: 'Google', consensus: 'De Tijuana-style truck die NYC voor birria liet vallen - in bouillon gedoopte taco’s en een bakje rijke consomé.', dish: 'Birria taco’s + consomé', dishSource: 'The Infatuation', quotes: [{ text: 'Maakt de beste birria van de stad, punt.', source: 'The Infatuation' }, { text: 'Limoen, mals vlees, adobo, druipend vet - alles smelt samen.', source: 'The Infatuation' }] },
  { id: 'pollos_mario', name: 'Pollos a la Brasa Mario', communityId: 'colombian', cuisine: 'Colombiaans', price: '$', address: '81-01 Roosevelt Ave', x: 54, y: 75, langGroup: 'spanish', tour: 14, rating: 4.4, ratingCount: 900, ratingSource: 'Google', consensus: 'Op houtskool geblakerde rotisserie-kip met ají - de geur trekt je zo van de 7-trein.', dish: 'Rotisserie-kip', dishSource: 'Vaste klanten', quotes: [{ text: 'Krokante chicharrón en kip vol smaak.', source: 'Yelp-reviewer' }, { text: 'Beste houtskoolkip op Roosevelt.', source: 'Google-reviewer' }] },
  { id: 'pequena', name: 'La Pequeña Colombia', communityId: 'colombian', cuisine: 'Colombiaans', price: '$$', address: '83-27 Roosevelt Ave', x: 61, y: 77, langGroup: 'spanish', tour: 15, rating: 4.2, ratingCount: 1100, ratingSource: 'Google', consensus: 'De volledige paisa-schotel onder één dak - de zit-klassieker die Little Colombia zijn naam gaf.', dish: 'Bandeja paisa', dishSource: 'Tripadvisor', quotes: [{ text: 'Waar voor je geld - stevig en authentiek.', source: 'Tripadvisor-reviewer' }, { text: 'Ik kan La Pequeña absoluut aanraden.', source: 'Tripadvisor-reviewer' }] },
  { id: 'hornado', name: 'Hornado Ecuatoriano', communityId: 'ecuadorian', cuisine: 'Ecuadoriaans', price: '$', address: '85-10 Roosevelt Ave', x: 66, y: 81, langGroup: 'spanish', tour: 16, rating: 4.3, ratingCount: 220, ratingSource: 'Google', consensus: 'Quito-style zondagse varkensbraad, ter plekke geplukt met krokante llapingachos en geroosterde mote.', dish: 'Hornado (varkensbraad)', dishSource: 'Vaste klanten', quotes: [{ text: 'Varkensbraad net als thuis in de sierra.', source: 'Google-reviewer' }, { text: 'Stevige borden en vriendelijk personeel.', source: 'Buurtbewoner' }] },
  { id: 'manabita', name: 'El Sabor Manabita', communityId: 'ecuadorian', cuisine: 'Ecuadoriaans', price: '$', address: '88-15 Roosevelt Ave', x: 71, y: 82, langGroup: 'spanish', tour: 17, rating: 4.2, ratingCount: 140, ratingSource: 'Google', consensus: 'Kustkeuken uit Manabí - heldere encebollado-vissoep, groene-bananen-bolón en verse ceviche.', dish: 'Encebollado', dishSource: 'Tripadvisor', quotes: [{ text: 'Mijn broer nam de encebollado en genoot er echt van.', source: 'Tripadvisor-reviewer' }, { text: 'Vers, kustachtig en vol smaak.', source: 'Google-reviewer' }] },
  { id: 'evolution', name: 'Club Evolution', communityId: 'lgbtq', cuisine: 'Nachtleven', price: '$$', address: '76-19 Roosevelt Ave', x: 44, y: 85, langGroup: 'spanish', tour: 18, rating: 4.1, ratingCount: 160, ratingSource: 'Google', consensus: 'Late dragshows en reggaetón op de Roosevelt Ave-strip - pailletten onder de verhoogde sporen.', dish: 'Dragshow in het weekend', dishSource: 'Buurtverhaal', quotes: [{ text: 'De dragshows zijn een hele productie.', source: 'Vaste gast' }, { text: 'Reggaetón tot laat onder de 7-lijn.', source: 'Buurtverhaal' }] },
]

export const PHRASE_GROUPS: PhraseGroup[] = [
  {
    id: 'hindi', tab: 'नमस्ते', label: 'Hindi / Urdu', flag: 'Gesproken in de Zuid-Aziatische kern', ttsLang: 'hi-IN', roman: false,
    phrases: [
      { en: 'Hallo', native: 'नमस्ते', roman: 'Namaste' },
      { en: 'Dank je', native: 'शुक्रिया', roman: 'Shukriya' },
      { en: 'Heerlijk!', native: 'बहुत स्वादिष्ट', roman: 'Bahut swādisht' },
      { en: 'Hoeveel kost het?', native: 'कितने का है?', roman: 'Kitne kā hai?' },
      { en: 'Een beetje pittig, graag', native: 'थोड़ा तीखा', roman: 'Thoṛā tīkhā' },
    ],
    foods: [
      { en: 'Linzenpannenkoek', native: 'दोसा', roman: 'Dosa' },
      { en: 'Gefrituurd deeg', native: 'समोसा', roman: 'Samosa' },
      { en: 'Gekruide rijst', native: 'बिरयानी', roman: 'Biryani' },
      { en: 'Straatsnacks', native: 'चाट', roman: 'Chaat' },
    ],
  },
  {
    id: 'bengali', tab: 'বাংলা', label: 'Bengaals', flag: 'Little Bangladesh, 73rd–74th St', ttsLang: 'bn-IN', roman: false,
    phrases: [
      { en: 'Hallo', native: 'নমস্কার', roman: 'Nomoshkar' },
      { en: 'Dank je', native: 'ধন্যবাদ', roman: 'Dhonnobad' },
      { en: 'Zo lekker!', native: 'খুব মজা', roman: 'Khub moja' },
      { en: 'Hoeveel?', native: 'কত দাম?', roman: 'Koto dam?' },
    ],
    foods: [
      { en: 'Vis in saus', native: 'মাছের ঝোল', roman: 'Macher jhol' },
      { en: 'Hilsa-vis', native: 'ইলিশ', roman: 'Ilish' },
      { en: 'Zoetigheid', native: 'মিষ্টি', roman: 'Mishti' },
      { en: 'Puffed-rice-snack', native: 'ঝালমুড়ি', roman: 'Jhalmuri' },
    ],
  },
  {
    id: 'nepali', tab: 'नेपाली', label: 'Nepalees', flag: 'Himalaya-keukens & winkels', ttsLang: 'hi-IN', roman: false,
    phrases: [
      { en: 'Hallo', native: 'नमस्ते', roman: 'Namaste' },
      { en: 'Dank je', native: 'धन्यवाद', roman: 'Dhanyabaad' },
      { en: 'Het is heerlijk', native: 'मिठो छ', roman: 'Mitho cha' },
      { en: 'Hoeveel is het?', native: 'कति हो?', roman: 'Kati ho?' },
    ],
    foods: [
      { en: 'Dumplings', native: 'मम', roman: 'Momo' },
      { en: 'Noedelsoep', native: 'थुक्पा', roman: 'Thukpa' },
      { en: 'Gefrituurde rijstring', native: 'सेलरोटी', roman: 'Sel roti' },
      { en: 'Setmaaltijd', native: 'खाना सेट', roman: 'Khana set' },
    ],
  },
  {
    id: 'tibetan', tab: 'བོད་སྐད', label: 'Tibetaans', flag: 'Momo-balies bij 74th St', ttsLang: 'en-US', roman: true,
    phrases: [
      { en: 'Hallo', native: 'བཀྲ་ཤིས་བདེ་ལེགས།', roman: 'Tashi delek' },
      { en: 'Dank je', native: 'ཐུགས་རྗེ་ཆེ།', roman: 'Thuk je che' },
      { en: 'Heerlijk', native: 'ཞིམ་པོ་འདུག', roman: 'Zhimpo duk' },
    ],
    foods: [
      { en: 'Dumplings', native: 'མོག་མོག', roman: 'Momo' },
      { en: 'Gestoomd brood', native: 'ཏིང་མོ', roman: 'Tingmo' },
      { en: 'Noedelsoep', native: 'ཐུག་པ', roman: 'Thukpa' },
    ],
  },
  {
    id: 'spanish', tab: '¡Hola!', label: 'Spaans', flag: 'Colombiaans · Mexicaans · Ecuadoriaans', ttsLang: 'es-MX', roman: false,
    phrases: [
      { en: 'Hallo!', native: '¡Hola!', roman: 'OH-lah' },
      { en: 'Dank je', native: 'Gracias', roman: 'GRAH-syas' },
      { en: 'Zo lekker!', native: '¡Qué rico!', roman: 'keh REE-koh' },
      { en: 'Hoeveel kost het?', native: '¿Cuánto cuesta?', roman: 'KWAN-toh KWES-tah' },
      { en: 'De rekening, graag', native: 'La cuenta, por favor', roman: 'lah KWEN-tah' },
    ],
    foods: [
      { en: 'Maïskoek', native: 'Arepa', roman: 'ah-REH-pah' },
      { en: 'Varkensbraad', native: 'Hornado', roman: 'or-NAH-doh' },
      { en: 'Paisa-schotel', native: 'Bandeja paisa', roman: 'ban-DEH-hah' },
      { en: 'Taco’s van het spit', native: 'Tacos al pastor', roman: 'al pas-TOR' },
    ],
  },
]

/**
 * Zet een gestileerde x/y (0-100) om naar een ruwe lat/lng binnen Jackson
 * Heights. Alleen voor de start-seeds zonder echte coördinaten; gescrapete
 * restaurants hebben echte lat/lng.
 */
export function xyToLatLng(x: number, y: number): [number, number] {
  const lng = -73.8916 + (x - 30) * 0.000385
  const lat = 40.7556 + (y - 16) * -0.0001452
  return [lat, lng]
}

/** Beste beschikbare coördinaten: echte lat/lng, anders afgeleid uit x/y. */
export function restaurantLatLng(r: Restaurant): [number, number] {
  if (typeof r.lat === 'number' && typeof r.lng === 'number') return [r.lat, r.lng]
  return xyToLatLng(r.x, r.y)
}

/** Middelpunt van Jackson Heights (kaart-default). */
export const JH_CENTER: [number, number] = [40.7488, -73.8839]

export const communityById = Object.fromEntries(COMMUNITIES.map((c) => [c.id, c]))
export const phraseGroupById = Object.fromEntries(PHRASE_GROUPS.map((g) => [g.id, g]))

/** De taal die je in een restaurant hoort, met de begroeting als voorbeeld. */
export function restaurantPhrase(r: Restaurant): { group: PhraseGroup; phrase: Phrase } {
  const group = phraseGroupById[r.langGroup] ?? PHRASE_GROUPS[0]
  return { group, phrase: group.phrases[0] }
}

/**
 * Probeert het aanbevolen gerecht te koppelen aan een gerecht in de taalgids,
 * zodat je het in de taal van de zaak kunt zien én horen. Matcht het (Dutch)
 * dish-veld op de native/roman/en-naam van een gerecht in de juiste taalgroep.
 * Geeft null als er geen betrouwbare match is.
 */
export function dishPhrase(r: Restaurant): { group: PhraseGroup; food: Phrase } | null {
  const group = phraseGroupById[r.langGroup]
  if (!group) return null
  const dish = r.dish.toLowerCase()
  const food = group.foods.find((f) => {
    const native = f.native.toLowerCase()
    const roman = f.roman.toLowerCase()
    const en = f.en.toLowerCase()
    return (
      (native.length > 2 && dish.includes(native)) ||
      (roman.length > 2 && dish.includes(roman)) ||
      (en.length > 3 && dish.includes(en))
    )
  })
  return food ? { group, food } : null
}
