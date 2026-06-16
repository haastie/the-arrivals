export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'options'
export interface Field {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: { value: string; label: string }[] // voor select
  help?: string
}

export const questionFields = (groupOptions: { value: string; label: string }[]): Field[] => [
  { key: 'id', label: 'ID (leeg = automatisch)', type: 'text', help: 'bv. s4-q4' },
  { key: 'group_id', label: 'Hoort bij', type: 'select', required: true, options: groupOptions },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { value: 'mc', label: 'Multiple choice' },
      { value: 'open', label: 'Open (host beoordeelt)' },
    ],
  },
  { key: 'prompt', label: 'Vraag', type: 'textarea', required: true },
  { key: 'options', label: 'Opties (mc)', type: 'options' },
  { key: 'correct_index', label: 'Index juiste optie (mc, 0-gebaseerd)', type: 'number' },
  { key: 'model_answer', label: 'Modelantwoord / rubric (open)', type: 'textarea' },
  { key: 'points', label: 'Punten', type: 'number', required: true },
  { key: 'is_timeline', label: '🕰️ Telt mee voor Tijdlijn-kern', type: 'boolean' },
  { key: 'discussion', label: 'Discussie (niet scoren)', type: 'boolean' },
  { key: 'sort_order', label: 'Volgorde', type: 'number' },
  { key: 'active', label: 'Actief (zichtbaar)', type: 'boolean' },
]

export const stopFields: Field[] = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'number', label: 'Nummer', type: 'number', required: true },
  { key: 'name', label: 'Naam', type: 'text', required: true },
  { key: 'optional', label: 'Optioneel', type: 'boolean' },
  { key: 'location', label: 'Locatie', type: 'text' },
  { key: 'era', label: 'Era', type: 'text' },
  { key: 'layer', label: 'Laag', type: 'text' },
  { key: 'food', label: 'Hapje', type: 'text' },
  { key: 'intro', label: 'Intro', type: 'textarea' },
  { key: 'reveal', label: 'Reveal (niet in warm-up)', type: 'textarea' },
  { key: 'background', label: 'Achtergrond', type: 'textarea' },
  { key: 'sort_order', label: 'Volgorde', type: 'number' },
]

export const cardFields: Field[] = [
  { key: 'id', label: 'ID (leeg = automatisch)', type: 'text' },
  { key: 'title', label: 'Titel', type: 'text', required: true },
  { key: 'body', label: 'Tekst', type: 'textarea', required: true },
  { key: 'sort_order', label: 'Volgorde', type: 'number' },
]

export const activityFields = (stopOptions: { value: string; label: string }[]): Field[] => [
  { key: 'id', label: 'ID (leeg = automatisch)', type: 'text' },
  { key: 'stop_id', label: 'Stop', type: 'select', required: true, options: stopOptions },
  { key: 'title', label: 'Titel', type: 'text', required: true },
  { key: 'body', label: 'Instructie', type: 'textarea', required: true },
  { key: 'sort_order', label: 'Volgorde', type: 'number' },
]

export const settingsFields: Field[] = [
  { key: 'title', label: 'Titel', type: 'text', required: true },
  { key: 'subtitle', label: 'Subtitel', type: 'text' },
  { key: 'date', label: 'Datum', type: 'text' },
  { key: 'central_question', label: 'Centrale vraag', type: 'textarea' },
  { key: 'opening_line', label: 'Openingszin', type: 'textarea' },
  { key: 'closing_line', label: 'Slotzin', type: 'textarea' },
  { key: 'warmup_intro', label: 'Warm-up intro', type: 'textarea' },
  { key: 'mc_points', label: 'Punten mc', type: 'number' },
  { key: 'open_points', label: 'Punten open', type: 'number' },
  { key: 'timeline_note', label: 'Tijdlijn-notitie', type: 'text' },
]
