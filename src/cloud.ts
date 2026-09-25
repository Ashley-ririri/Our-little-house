import i18n from './i18n/i18n'
import { normalizeRoom } from './logic'
import { supabase } from './lib/supabaseClient'
import type { CheckIn, ModuleId, Room, User } from './types'

type RoomRow = {
  id: string
  invite_code: string
  name: string
  current_target_furniture: string | null
  unlocked_ids: string[] | null
  cat_outfit_id: string | null
  goal_set_at: string | null
  updated_at: string
}

type UserRow = { id: string; name: string; avatar_color: string }
type LogRow = {
  user_id: string
  category: ModuleId
  status: 'done' | 'skipped'
  log_date: string
  blueprint_id: string | null
  created_at: string
}

function sixDigit() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000
  return String(n).padStart(6, '0')
}

function toRoom(row: RoomRow, users: UserRow[], logs: LogRow[]): Room {
  const checkIns: CheckIn[] = logs.map((log) => ({
    date: log.log_date,
    moduleId: log.category,
    userId: log.user_id,
    action: log.status === 'done' ? 'done' : 'rest',
    at: new Date(log.created_at).getTime(),
    blueprintId: log.blueprint_id ?? '',
  }))
  return normalizeRoom({
    id: row.id,
    inviteCode: row.invite_code,
    name: row.name,
    users: users.map((user) => ({ id: user.id, name: user.name, color: user.avatar_color })),
    unlockedIds: row.unlocked_ids ?? [],
    currentBlueprintId: row.current_target_furniture,
    goalSetAt: row.goal_set_at ? new Date(row.goal_set_at).getTime() : null,
    catOutfitId: row.cat_outfit_id,
    checkIns,
    pieces: 0,
    updatedAt: new Date(row.updated_at).getTime(),
  })
}

export async function loadMyRoom(userId: string): Promise<{ room: Room; me: User } | null> {
  if (!supabase) return null
  const { data: member } = await supabase
    .from('users')
    .select('id,room_id')
    .eq('id', userId)
    .maybeSingle()
  const roomId = (member as { room_id?: string } | null)?.room_id
  if (!roomId) return null
  const { data: row } = await supabase.from('rooms').select('invite_code').eq('id', roomId).maybeSingle()
  const code = (row as { invite_code?: string } | null)?.invite_code
  if (!code) return null
  const room = await loadOnlineRoom(code)
  const me = room?.users.find((user) => user.id === userId)
  if (!room || !me) return null
  return { room, me }
}

export async function loadOnlineRoom(code: string): Promise<Room | null> {
  if (!supabase) return null
  const { data: row } = await supabase.from('rooms').select('*').eq('invite_code', code).maybeSingle()
  if (!row) return null
  const room = row as RoomRow
  const [{ data: users }, { data: logs }] = await Promise.all([
    supabase.from('users').select('id,name,avatar_color').eq('room_id', room.id),
    supabase.from('daily_logs').select('user_id,category,status,log_date,blueprint_id,created_at').eq('room_id', room.id),
  ])
  return toRoom(room, (users ?? []) as UserRow[], (logs ?? []) as LogRow[])
}

export async function createOnlineHome(name: string, owner: User): Promise<Room | null> {
  if (!supabase) return null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = sixDigit()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ invite_code: inviteCode, name: name.trim() || i18n.t('defaultHome') })
      .select('*')
      .single()
    if (error || !data) continue
    const room = data as RoomRow
    const { error: userError } = await supabase.from('users').insert({
      id: owner.id,
      room_id: room.id,
      name: owner.name,
      avatar_color: owner.color,
    })
    if (userError) return null
    return toRoom(room, [{ id: owner.id, name: owner.name, avatar_color: owner.color }], [])
  }
  return null
}

export async function persistRoom(room: Room) {
  if (!supabase || !room.inviteCode) return
  await supabase
    .from('rooms')
    .update({
      name: room.name,
      current_target_furniture: room.currentBlueprintId,
      target_progress: room.pieces,
      unlocked_ids: room.unlockedIds,
      cat_outfit_id: room.catOutfitId,
      goal_set_at: room.goalSetAt ? new Date(room.goalSetAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', room.id)
  if (room.users.length) {
    await supabase.from('users').upsert(
      room.users.map((user) => ({
        id: user.id,
        room_id: room.id,
        name: user.name,
        avatar_color: user.color,
      })),
    )
  }
  if (room.checkIns.length) {
    await supabase.from('daily_logs').upsert(
      room.checkIns.map((entry) => ({
        room_id: room.id,
        user_id: entry.userId,
        category: entry.moduleId,
        status: entry.action === 'done' ? 'done' : 'skipped',
        log_date: entry.date,
        blueprint_id: entry.blueprintId,
        created_at: new Date(entry.at).toISOString(),
      })),
      { onConflict: 'user_id,category,log_date' },
    )
  }
}

export async function sendNudge(roomId: string, from: User, toUserId: string) {
  if (!supabase) return
  await supabase.from('nudges').insert({
    room_id: roomId,
    from_user_id: from.id,
    to_user_id: toUserId,
    from_name: from.name,
  })
}

export function subscribeRoom(room: Room, onChange: () => void, onNudge: (fromName: string, toUserId: string) => void) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`room-${room.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs', filter: `room_id=eq.${room.id}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `room_id=eq.${room.id}` }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nudges', filter: `room_id=eq.${room.id}` }, (payload) => {
      const row = payload.new as { from_name?: string; to_user_id?: string; from_user_id?: string }
      if (row.from_name && row.to_user_id) onNudge(row.from_name, row.to_user_id)
    })
    .subscribe()
  return () => {
    void supabase?.removeChannel(channel)
  }
}
