import { supabase } from './supabase'

async function rpc(fn: string, args: Record<string, unknown>) {
  const { error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
}

export async function adminCheck(secret: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_check', { p_secret: secret })
  if (error) throw new Error(error.message)
  return data === true
}

export const adminUpsertQuestion = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_question', { p_secret: secret, p_row: row })
export const adminDeleteQuestion = (secret: string, id: string) =>
  rpc('admin_delete_question', { p_secret: secret, p_id: id })
export const adminUpsertStop = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_stop', { p_secret: secret, p_row: row })
export const adminDeleteStop = (secret: string, id: string) =>
  rpc('admin_delete_stop', { p_secret: secret, p_id: id })
export const adminUpsertCard = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_card', { p_secret: secret, p_row: row })
export const adminDeleteCard = (secret: string, id: string) =>
  rpc('admin_delete_card', { p_secret: secret, p_id: id })
export const adminUpsertActivity = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_activity', { p_secret: secret, p_row: row })
export const adminDeleteActivity = (secret: string, id: string) =>
  rpc('admin_delete_activity', { p_secret: secret, p_id: id })
export const adminUpsertRestaurant = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_upsert_restaurant', { p_secret: secret, p_row: row })
export const adminDeleteRestaurant = (secret: string, id: string) =>
  rpc('admin_delete_restaurant', { p_secret: secret, p_id: id })
export const adminUpdateSettings = (secret: string, row: Record<string, unknown>) =>
  rpc('admin_update_settings', { p_secret: secret, p_row: row })
