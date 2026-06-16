const KEY = 'ta_admin_secret'

export function saveAdminSecret(s: string) {
  localStorage.setItem(KEY, s)
}
export function loadAdminSecret(): string | null {
  return localStorage.getItem(KEY)
}
export function clearAdminSecret() {
  localStorage.removeItem(KEY)
}
