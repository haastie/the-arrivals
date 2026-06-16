import { supabase } from '../lib/supabase'
import type { ContentRows } from './types'

export async function fetchContentRows(): Promise<ContentRows> {
  const [settings, stops, cards, questions, activities] = await Promise.all([
    supabase.from('app_settings').select('*').eq('id', 1).single(),
    supabase.from('stops').select('*'),
    supabase.from('background_cards').select('*'),
    supabase.from('questions').select('*'),
    supabase.from('activities').select('*'),
  ])
  for (const r of [settings, stops, cards, questions, activities]) {
    if (r.error) throw new Error(r.error.message)
  }
  return {
    settings: settings.data as ContentRows['settings'],
    stops: (stops.data ?? []) as ContentRows['stops'],
    cards: (cards.data ?? []) as ContentRows['cards'],
    questions: (questions.data ?? []) as ContentRows['questions'],
    activities: (activities.data ?? []) as ContentRows['activities'],
  }
}
