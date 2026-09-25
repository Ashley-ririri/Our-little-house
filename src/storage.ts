import { normalizeRoom } from './logic'
import type { Room, User } from './types'

const ROOM_KEY = 'lobby-home-room'
const ME_KEY = 'lobby-home-me'

export function loadRoom(): Room | null {
  try {
    const raw = localStorage.getItem(ROOM_KEY)
    if (!raw) return null
    return normalizeRoom(JSON.parse(raw) as Room)
  } catch {
    return null
  }
}

export function saveRoom(room: Room) {
  localStorage.setItem(ROOM_KEY, JSON.stringify(room))
}

export function loadMe(room: Room | null): User | null {
  if (!room) return null
  try {
    const raw = sessionStorage.getItem(ME_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as User
    return room.users.some((item) => item.id === user.id) ? user : null
  } catch {
    return null
  }
}

export function saveMe(user: User) {
  sessionStorage.setItem(ME_KEY, JSON.stringify(user))
}

export function clearMe() {
  sessionStorage.removeItem(ME_KEY)
}

export function clearHome() {
  localStorage.removeItem(ROOM_KEY)
  sessionStorage.removeItem(ME_KEY)
}
