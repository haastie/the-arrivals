import type {
  Activity, Content, ContentRows, Meta, Question, QuestionRow, RestaurantRow, Stop, Warmup,
} from './types'
import type { Restaurant } from '../data/jacksonHeightsMap'

export interface QuestionLocation {
  question: Question
  stop?: Stop
  groupId: string
  groupLabel: string
}

export interface MappedContent extends Content {
  stopsWithQuestions: Stop[]
  restaurants: Restaurant[]
  findQuestion(id: string | null | undefined): QuestionLocation | undefined
  findActivity(id: string | null | undefined): { activity: Activity; stop: Stop } | undefined
  isActivityId(id: string | null | undefined): boolean
}

function toRestaurant(r: RestaurantRow): Restaurant {
  return {
    id: r.id,
    name: r.name,
    communityId: r.community_id,
    cuisine: r.cuisine ?? '',
    price: r.price ?? '',
    address: r.address ?? '',
    x: r.x,
    y: r.y,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    langGroup: r.lang_group ?? null,
    tour: r.tour ?? 0,
    rating: r.rating ?? 0,
    ratingCount: r.rating_count ?? 0,
    ratingSource: r.rating_source ?? '',
    consensus: r.consensus ?? '',
    dish: r.dish ?? '',
    dishSource: r.dish_source ?? '',
    quotes: Array.isArray(r.quotes) ? r.quotes : [],
  }
}

export function mapContent(rows: ContentRows): MappedContent {
  const s = rows.settings
  const meta: Meta = {
    title: s.title,
    subtitle: s.subtitle ?? '',
    language: s.language ?? 'nl',
    date: s.date ?? '',
    centralQuestion: s.central_question ?? '',
    redThread: s.red_thread ?? s.central_question ?? '',
    mechanism: s.mechanism ?? '',
    openingLine: s.opening_line ?? '',
    landAcknowledgement: s.land_acknowledgement ?? '',
    closingLine: s.closing_line ?? '',
    scoring: { mcPoints: s.mc_points, openPoints: s.open_points },
  }

  const activeQuestions = rows.questions.filter((q) => q.active)
  const byGroup = (gid: string): Question[] =>
    activeQuestions
      .filter((q) => q.group_id === gid)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toQuestion)

  const warmup: Warmup = {
    intro: s.warmup_intro ?? '',
    backgroundCards: [...rows.cards]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ id: c.id, title: c.title, body: c.body })),
    questions: byGroup('warmup'),
  }

  const stops: Stop[] = [...rows.stops]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((st) => ({
      id: st.id,
      number: st.number,
      name: st.name,
      optional: st.optional,
      location: st.location ?? '',
      era: st.era ?? '',
      layer: st.layer ?? '',
      food: st.food ?? undefined,
      intro: st.intro ?? '',
      reveal: st.reveal ?? '',
      background: st.background ?? '',
      activities: rows.activities
        .filter((a) => a.stop_id === st.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((a) => ({ id: a.id, title: a.title, body: a.body })),
      questions: byGroup(st.id),
    }))

  const questionIndex = new Map<string, QuestionLocation>()
  for (const q of warmup.questions) {
    questionIndex.set(q.id, { question: q, groupId: 'warmup', groupLabel: 'Warm-up' })
  }
  for (const stop of stops) {
    for (const q of stop.questions) {
      questionIndex.set(q.id, {
        question: q,
        stop,
        groupId: stop.id,
        groupLabel: `Stop ${stop.number} · ${stop.name}`,
      })
    }
  }

  const activityIndex = new Map<string, { activity: Activity; stop: Stop }>()
  for (const stop of stops) {
    for (const a of stop.activities ?? []) activityIndex.set(a.id, { activity: a, stop })
  }

  const restaurants = [...rows.restaurants]
    .filter((r) => r.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(toRestaurant)

  return {
    meta,
    warmup,
    stops,
    restaurants,
    stopsWithQuestions: stops.filter((st) => st.questions.length > 0),
    findQuestion: (id) => (id ? questionIndex.get(id) : undefined),
    findActivity: (id) => (id ? activityIndex.get(id) : undefined),
    isActivityId: (id) => !!id && activityIndex.has(id),
  }
}

function toQuestion(q: QuestionRow): Question {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options ?? undefined,
    correctIndex: q.correct_index ?? undefined,
    modelAnswer: q.model_answer ?? undefined,
    points: q.points,
    discussion: q.discussion,
  }
}
