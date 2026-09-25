import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export function inviteCodeFromPath(path = window.location.pathname) {
  return path.match(/^\/room\/(\d{6})\/?$/)?.[1] ?? null
}

export function inviteLink(code: string) {
  return `${window.location.origin}/room/${code}`
}
