// Statisch host-draaiboek per stop, afgeleid uit The_Arrivals_ACHTERGROND_V2.md.
// HOOFDINFO bovenaan, daarna het verhaal als bullets met de vragen op hun plek.
// `question`-beats verwijzen naar vraag-id's in de DB (group_id = stop-id).

export type PlaybookBeat = { kind: 'note'; text: string } | { kind: 'question'; id: string }

export interface StopPlaybook {
  hoofdinfo: string[]
  script: PlaybookBeat[]
}

const n = (text: string): PlaybookBeat => ({ kind: 'note', text })
const q = (id: string): PlaybookBeat => ({ kind: 'question', id })

export const STOP_PLAYBOOK: Record<string, StopPlaybook> = {
  s1: {
    hoofdinfo: [
      'Gepland project van de Queensboro Corporation (MacDougall) — niet organisch gegroeid.',
      '"Heights" = pure marketing: een plat weiland ("Trains Meadow") dat het prestige van Brooklyn Heights leende.',
      'Gebouwd voor White Anglo-Saxon Protestants; geweerd: Joden, zwarte Amerikanen, in de praktijk ook katholieken/Italianen/Grieken.',
      'De uitsluiting zat óók in het coöperatie-model: bewoners kozen zelf wie er introk.',
    ],
    script: [
      n('Tot 1900 moerassig boerenland; de Queensboro Bridge (1909) en de metro (1917) brachten Manhattan op forensenafstand. MacDougall kocht alles op en bouwde er een merk omheen.'),
      q('s1-q1'),
      n('Zijn innovatie: de "garden apartment" — gesloten blokken rond een verborgen binnentuin. Agressief verkocht (radioreclame, "restricted community" als verkoopargument).'),
      q('s1-q2'),
      n('De zeef werkte op twee niveaus: restrictieve aktes (covenants), en — duurzamer — het coöperatieve model waarin de buren zélf beslisten. Pas in 1948 onafdwingbaar (Shelley v. Kraemer); informeel nog jaren daarna.'),
      q('s1-q3'),
      n('Verteltip: de Olmsted-tuin is "men zegt dat" — vertel als anekdote. Houd het mechanisme vast: het komt elke stop terug, telkens vermomd.'),
    ],
  },
  s2: {
    hoofdinfo: [
      'Scrabble bedacht door Alfred Butts (werkloze architect), ontwikkeld in de kelder van deze kerk. (1938 = "Criss-Cross Words"; naam "Scrabble" pas 1948 via James Brunot.)',
      "In de jaren '40 doorbraken Joden én homoseksuele mannen de witte utopie.",
      'Lange LGBT-traditie; het Jewish Center op 77th huisvest nu óók Hindoe-, Pinkster- en Iftar-diensten.',
    ],
    script: [
      n('De Depressie deed wat idealen niet deden: exclusiviteit werd onbetaalbaar. Een verhuurder kiest tussen "leeg" en "een gezin" — en kiest het gezin.'),
      q('s2-q2'),
      n('Twee soorten "ongewenste" nieuwkomers tegelijk: Joodse New Yorkers én homoseksuele mannen uit Manhattan (anonimiteit + betaalbaarheid) — de kiem van de latere grootste Latino-LGBTQ-cultuur van de stad.'),
      q('s2-q1'),
      n('Butts bepaalde de punten via de letterfrequentie van het Engels — daarom is de E goedkoop en de Q duur.'),
      q('s2-q3'),
      n('Eén gebouw, alle werelden: hier preekt men nu in Engels, Spaans én Mandarijn. De palimpsest in religieuze vorm — dezelfde stenen, nieuwe stemmen die de ruimte delen.'),
    ],
  },
  s3: {
    hoofdinfo: [
      "Colombianen = eerste grote Latino-golf (jaren '50), lang de meest zichtbare; \"Little Colombia\" / Chapinero.",
      'Vandaag zijn Ecuadorianen de grootste groep (~16%), dan Colombianen; grote Dominicaanse, Mexicaanse en Bangladeshi-gemeenschappen.',
      'Arepa = maïskoek. Terraza 7 (Freddy Castiblanco) = cultuur als verzet tegen gentrificatie.',
      "Donkere kant: cocaïne-jaren '80 op Roosevelt; journalist Manuel de Dios Unanue vermoord (1992).",
    ],
    script: [
      n('Dit was decennialang "Little Colombia" / Chapinero (rond 82nd–83rd & Roosevelt).'),
      q('s3-q1'),
      n('Waarom toen? La Violencia (1948–58) dreef Colombianen weg; JH bood goedkope huur, de 7-metro én ketenmigratie (de eersten haalden familie na).'),
      q('s3-q3'),
      n('Maar het verhaal moet schuiven: vandaag zijn Ecuadorianen de grootste groep. "Latino" is geen monoliet — de buurt dwingt nabuurschap, geen eenheid.'),
      q('s3-q2'),
      n('Eerlijk over de schaduw: Roosevelt had een zware cocaïne-reputatie; journalist Manuel de Dios Unanue werd in 1992 vermoord (Cali-kartel) — een aanslag op de persvrijheid.'),
      n('Hoopvol tegenbeeld: Terraza 7 (Freddy Castiblanco), een cultureel platform tegen verdringing. (Opent pas ~17:00 — wijs het aan.) Proef de arepa.'),
      q('s3-q4'),
    ],
  },
  s4: {
    hoofdinfo: [
      'Roosevelt Ave (onder de 7) = de informele economie: remittances (~$650 mld/jr, meer dan alle ontwikkelingshulp), valse documenten, zichtbaar sekswerk.',
      'Lorena Borjas: "moeder van de trans-Latinx-gemeenschap van Queens". Mexicaanse migrant (1981), zelf slachtoffer van mensenhandel.',
      'Decennialange outreach: condooms/spuiten, hiv-tests, borgsommen, opvang bij haar thuis.',
      '2017 gepardonneerd (campagne o.l.v. Danny Dromm); stierf maart 2020 als vroeg COVID-slachtoffer.',
    ],
    script: [
      n('Twee straten, twee werelden: 37th Ave = de nette "sidewalk ballet"; Roosevelt = rauwer, onder de geribbelde schaduw van de 7. Hier draait de "informele stad".'),
      q('s4-q1'),
      n('Dat geld omzeilt regeringen en corruptie — rechtstreeks naar een grootmoeder voor medicijnen of een zus voor schoolgeld. De geldtransferwinkels zijn de infrastructuur ervan.'),
      n('Eén vrouw belichaamt deze laag: Lorena Borjas. Op precies deze stoep bouwde ze een zorgnetwerk voor de meest kwetsbaren — transvrouwen, sekswerkers, ongedocumenteerden, mensen met hiv.'),
      q('s4-q2'),
      n('Ze verbindt vier draden: queer geschiedenis, sekswerk, migratie en de pandemie. Vertel de straat via haar — rechten en waardigheid, geen sensatie.'),
    ],
  },
  s5: {
    hoofdinfo: [
      'Immigration & Nationality Act 1965 (Hart-Celler) schrapte de raciale quota en opende migratie uit Azië.',
      'Eerste Indiase migranten vaak hooggeschoold (artsen/ingenieurs/academici).',
      'De tweede verdiepingen = kantoortjes om het systeem te navigeren (green cards, SAT-prep, notarios).',
      'Na 9/11: Special Registration, detenties, surveillance; taxichauffeurs als doelwit; ontstaan van DRUM.',
      'De Partition (1947) verklaart de aparte India/Pakistan/Bangladesh-gemeenschappen.',
    ],
    script: [
      n('De belangrijkste wet van de dag. 1924–1965 gold de "national origins quota" (bijna totale blokkade van Aziaten). Hart-Celler verving dat door beroepsvaardigheid + gezinshereniging.'),
      q('s5-q1'),
      n('De wetgevers dachten dat het de demografie nauwelijks zou veranderen — een van de grootste misrekeningen ooit. Voorrang voor hooggeschoolden → de eerste Indiërs waren artsen en ingenieurs.'),
      n('74th St werd "Little India": sari\'s, goud, mithai, het mythische Sam & Raj (nu dicht — vertel als geschiedenis). Kijk omhoog naar de tweede verdiepingen.'),
      q('s5-q2'),
      n('De ondergrond: 1947, de Partition — Brits-Indië gesplitst (≈1 mln doden, 10–15 mln ontheemd); in 1971 werd Bangladesh een land. Hier wonen nazaten van mensen die thuis aan dodelijke grenzen stonden, als buren.'),
      q('s5-q4'),
      n('En de belonging-crisis: na 9/11 werd dezelfde gemeenschap verdacht gemaakt — NSEERS/Special Registration, detenties, hate crimes. Hieruit ontstond DRUM. De zeef in zijn modernste, lelijkste vorm.'),
      q('s5-q3'),
    ],
  },
  s6: {
    hoofdinfo: [
      'Nieuwste laag: Tibet, Nepal, Bhutan, Bangladesh. "Little Nepal" is minstens zo groot als de Tibetaanse aanwezigheid.',
      'Veel Tibetanen zijn vluchtelingen/ballingen; de Immigration Act van 1990 wees 1.000 visa toe aan ontheemde Tibetanen.',
      'Het food court was bioscoop Earle → Eagle (één letter — "het verhaal gaat dat").',
      'Diversity Plaza is sinds 2012 autovrij — het de-facto stadsplein.',
    ],
    script: [
      n('Migratie door verlies, niet door kansen. Na de Chinese annexatie van Tibet (1950) en de vlucht van de Dalai Lama (1959) ontstond een diaspora; 1990 wees 1.000 visa toe aan ontheemde Tibetanen.'),
      q('s6-q2'),
      n('Zeg niet alleen "Tibetaans": de Nepalese gemeenschap is minstens zo groot (echte "Little Nepal"), plus Bhutanezen en een grote Bengaalse gemeenschap. Het bindende gerecht is de momo (er is zelfs een Momo Crawl).'),
      q('s6-q1'),
      n('Het gebouw met vier levens: art-deco-paleis The Earle (jaren \'30) → pornofilms (\'70) → Bollywood-bioscoop (\'80, Earle→Eagle) → Zuid-Aziatisch food court. Eén gevel, vier economieën.'),
      q('s6-q3'),
      n('Eet-moment: Kabab King op de hoek staat in de NYT-100 van 2026 — en in Mamdani\'s top 3.'),
      q('s6-q4'),
      n('De plaza zelf is sinds 2012 autovrij: schaaktafels, eetkraampjes, een dozijn talen — een vroege voorbode van de Open Street waar we eindigen.'),
    ],
  },
  s7: {
    hoofdinfo: [
      "María Piedad Cano (de Arepa Lady) begon eind jaren '80 op een straatkar; nu een restaurant — informele economie die institutionaliseert.",
      'De nieuwe zeef = gentrificatie: documentatie/kredietchecks (die ook legale migranten missen) + prijs (300k → ~1 mln).',
      'Gevolg: kelderwoningen, soms "hot beds" (bedden in shifts).',
    ],
    script: [
      n("Het optimistische verhaal: de Arepa Lady bakte jarenlang 's nachts arepa's op een kar; cultstatus → een echt restaurant (gerund door haar zonen). Informeel → reputatie → formeel."),
      q('s7-q1'),
      n('Proef de arepa de choclo — zoete maïs onder een deken van gesmolten kaas.'),
      q('s7-q3'),
      n('De keerzijde is je rode draad: gentrificatie. Garden apartments naderen het miljoen. Het venijn zit niet alleen in de huur maar in documentatie — krediet, referenties, papieren die een recent gearriveerde (ook legale) migrant niet heeft.'),
      q('s7-q2'),
      n('Maak de cirkel met Stop 1 hardop: in 1910 hield een coöperatie-stemming mensen buiten; in 2026 doet een kredietscore hetzelfde werk. Dezelfde machine, ander pak.'),
    ],
  },
  s8: {
    hoofdinfo: [
      'In 1990 werd Julio Rivera (29, homoseksuele barman) door skinheads vermoord — een beruchte hate crime.',
      'Eruit ontstond de Queens Pride Parade, opgericht door buurtbewoner/leraar Danny Dromm (later raadslid).',
      'Queer lijn: Rivera (1990) → Lorena Borjas (2020), dertig jaar op dezelfde straten.',
    ],
    script: [
      n("Het dieptepunt: late jaren '80/vroege '90 — criminaliteit, verval, aids. In 1990 werd Julio Rivera naar een schoolplein gelokt en vermoord, uitsluitend omdat hij homo was — een van de eerste als anti-homo hate crime vervolgde zaken."),
      q('s8-q1'),
      n('Wat eruit groeide: de Queens Pride Parade (eerste editie 1993), mede opgericht door Danny Dromm — dezelfde Dromm die later het pardon van Lorena Borjas (Stop 4) bevocht. Eén queer lijn, dertig jaar.'),
      q('s8-q2'),
      n('Het eerlijke punt: geen plotselinge liefde, maar verandering die bevochten is. Een buurt die iemand vermoordde om wie hij was, viert hem nu.'),
    ],
  },
  s9: {
    hoofdinfo: [
      'Jackson Heights was voorjaar 2020 het epicentrum van de COVID-uitbraak in NYC.',
      'Uit de crisis groeide de 34th Avenue Open Street (±2 mijl autovrij) — "de eerste superblock van New York".',
      'Van afgeschermde privételuin (1910) naar heroverde publieke straat (2020): het hele verhaal in één gebaar.',
      'Dit is het slot — sluit af met de slotvraag en laat de groep het laatste woord.',
    ],
    script: [
      n('Waarom hier zo hard: dichtheid (gedeelde kelders, isoleren onmogelijk) + beroep (essentiële werkers die niet konden thuiswerken). Elmhurst Hospital werd het nationale symbool; Borjas stierf in deze weken.'),
      q('s9-q2'),
      n('En precies hier vocht de gemeenschap iets hoopvols af: de 34th Ave Open Street — twee mijl dagelijks autovrij, met programmering voor kinderen, ouderen en sporters.'),
      q('s9-q1'),
      n('De cirkel sluit: 1910 ontworpen rond verborgen privétuinen (groen als exclusief bezit); 100 jaar later de straat zélf heroverd als gedeelde publieke ruimte. Privé → publiek: het hele verhaal in één gebaar.'),
      n('Sluit af zonder moraal — laat de groep praten:'),
      q('s9-q3'),
    ],
  },
  s10: {
    hoofdinfo: [
      'Optioneel — de tour sluit inhoudelijk af bij Stop 9; Jahn\'s is een bonus met ijs.',
      'Jahn\'s: de keten begon 1897 (Bronx); deze vestiging draait sinds 1959 en is de laatste die nog open is (gerenoveerd 2025).',
      'Handelsmerk: de Kitchen Sink Sundae for eight — alleen samen op te eten.',
    ],
    script: [
      n('De gemeenschappelijke noemer onder alle lagen: generaties JH-families van elke herkomst kwamen hier na school, na een eerste date, na een examen.'),
      q('s10-q1'),
      n('Mehta\'s familie bestelde de Sink Sundae kort na aankomst en dacht: dít is de belofte van de Nieuwe Wereld. Eet samen uit één veel te grote coupe.'),
    ],
  },
}
