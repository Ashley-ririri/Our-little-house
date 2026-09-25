import { USER_COLORS, getBlueprint } from './catalog'
import i18n from './i18n/i18n'
import { todayStamp } from './time'
import type { CheckIn, ModuleId, Room, User } from './types'

const REST_KEYS = ['restLine1', 'restLine2', 'restLine3', 'restLine4'] as const

export function restLine() {
  return i18n.t(REST_KEYS[Math.floor(Math.random() * REST_KEYS.length)])
}

export function pieceText(item: string, count: number, total: number) {
  if (count <= 1) return i18n.t('pieceFirst', { item })
  if (count === total - 1) return i18n.t('pieceLast')
  return i18n.t('pieceMid', { count })
}

export function remotePieceText(name: string, count: number, total: number) {
  if (count === total - 1) return i18n.t('pieceLastNamed', { name })
  return i18n.t('pieceMidNamed', { name, count })
}

export function checkKey(entry: { date: string; moduleId: string; userId: string }) {
  return `${entry.date}|${entry.moduleId}|${entry.userId}`
}

export function makeUser(name: string, index: number, id?: string): User {
  return {
    id: id ?? crypto.randomUUID(),
    name: name.trim(),
    color: USER_COLORS[index % USER_COLORS.length],
  }
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export function createRoom(name: string, owner: User): Room {
  return {
    id: roomCode(),
    name: name.trim() || i18n.t('defaultHome'),
    users: [owner],
    unlockedIds: [],
    currentBlueprintId: null,
    goalSetAt: null,
    catOutfitId: null,
    checkIns: [],
    pieces: 0,
    updatedAt: Date.now(),
  }
}

export function derivePieces(room: Room) {
  if (!room.currentBlueprintId) return 0
  return room.checkIns.filter(
    (entry) => entry.action === 'done' && entry.blueprintId === room.currentBlueprintId,
  ).length
}

export function resolveCompletion(room: Room): Room {
  const blueprint = room.currentBlueprintId ? getBlueprint(room.currentBlueprintId) : undefined
  if (!blueprint) return { ...room, currentBlueprintId: null, goalSetAt: null, pieces: 0 }
  const pieces = derivePieces(room)
  if (pieces >= blueprint.pieces) {
    const unlockedIds = room.unlockedIds.includes(blueprint.id)
      ? room.unlockedIds
      : [...room.unlockedIds, blueprint.id]
    return {
      ...room,
      unlockedIds,
      catOutfitId: blueprint.kind === 'outfit' ? blueprint.id : room.catOutfitId,
      currentBlueprintId: null,
      goalSetAt: null,
      pieces: 0,
    }
  }
  return { ...room, pieces }
}

export function normalizeRoom(raw: Room): Room {
  return resolveCompletion({
    id: raw.id,
    inviteCode: raw.inviteCode,
    name: raw.name || i18n.t('defaultHome'),
    users: raw.users ?? [],
    unlockedIds: raw.unlockedIds ?? [],
    currentBlueprintId: raw.currentBlueprintId ?? null,
    goalSetAt: raw.goalSetAt ?? null,
    catOutfitId: raw.catOutfitId ?? null,
    checkIns: raw.checkIns ?? [],
    pieces: 0,
    updatedAt: raw.updatedAt ?? 0,
  })
}

export function withUser(room: Room, user: User): Room {
  if (room.users.some((item) => item.id === user.id)) return room
  return { ...room, users: [...room.users, user], updatedAt: Date.now() }
}

export function withOutfit(room: Room, outfitId: string | null): Room | null {
  if (outfitId === room.catOutfitId) return room
  if (outfitId && (!room.unlockedIds.includes(outfitId) || getBlueprint(outfitId)?.kind !== 'outfit')) return null
  return { ...room, catOutfitId: outfitId, updatedAt: Date.now() }
}

export function withGoal(room: Room, blueprintId: string): Room | null {
  if (room.currentBlueprintId) return null
  if (room.unlockedIds.includes(blueprintId)) return null
  if (!getBlueprint(blueprintId)) return null
  return {
    ...room,
    currentBlueprintId: blueprintId,
    goalSetAt: Date.now(),
    pieces: 0,
    updatedAt: Date.now(),
  }
}

export function withCheckIn(
  room: Room,
  input: { userId: string; moduleId: ModuleId; action: 'done' | 'rest'; at?: number },
): { room: Room; kind: 'piece' | 'rest' } | { error: 'no-goal' | 'already' } {
  if (!room.currentBlueprintId) return { error: 'no-goal' }
  const at = input.at ?? Date.now()
  const date = todayStamp(new Date(at))
  const key = checkKey({ date, moduleId: input.moduleId, userId: input.userId })
  if (room.checkIns.some((entry) => checkKey(entry) === key)) return { error: 'already' }
  const entry: CheckIn = {
    date,
    moduleId: input.moduleId,
    userId: input.userId,
    action: input.action,
    at,
    blueprintId: room.currentBlueprintId,
  }
  return {
    room: { ...room, checkIns: [...room.checkIns, entry], updatedAt: at },
    kind: input.action === 'done' ? 'piece' : 'rest',
  }
}

export function findCheckIn(room: Room, userId: string, moduleId: ModuleId, date: string) {
  return room.checkIns.find(
    (entry) => entry.userId === userId && entry.moduleId === moduleId && entry.date === date,
  )
}

function mergeCheckIns(left: CheckIn[], right: CheckIn[]) {
  const map = new Map<string, CheckIn>()
  for (const entry of [...left, ...right]) {
    const key = checkKey(entry)
    const previous = map.get(key)
    if (!previous || (previous.action !== 'done' && (entry.action === 'done' || entry.at > previous.at))) {
      map.set(key, entry)
    }
  }
  return [...map.values()]
}

function mergeUsers(left: User[], right: User[]) {
  const map = new Map<string, User>()
  for (const user of [...left, ...right]) map.set(user.id, user)
  return [...map.values()]
}

function scoreGoal(room: Room) {
  if (!room.currentBlueprintId) return 0
  return room.checkIns.filter(
    (entry) => entry.action === 'done' && entry.blueprintId === room.currentBlueprintId,
  ).length
}

export function mergeRooms(left: Room, right: Room): Room {
  const checkIns = mergeCheckIns(left.checkIns, right.checkIns)
  const users = mergeUsers(left.users, right.users)
  const unlockedIds = [...new Set([...left.unlockedIds, ...right.unlockedIds])]
  const options = [left, right].filter(
    (room) => room.currentBlueprintId && !unlockedIds.includes(room.currentBlueprintId),
  )
  options.sort((a, b) => scoreGoal(b) - scoreGoal(a) || (b.goalSetAt ?? 0) - (a.goalSetAt ?? 0))
  const goal = options[0]
  const newer = left.updatedAt >= right.updatedAt ? left : right
  const older = newer === left ? right : left
  let catOutfitId = newer.catOutfitId
  if (catOutfitId && !unlockedIds.includes(catOutfitId)) catOutfitId = older.catOutfitId
  if (catOutfitId && !unlockedIds.includes(catOutfitId)) catOutfitId = null
  return {
    id: left.id,
    name: newer.name,
    users,
    unlockedIds,
    currentBlueprintId: goal?.currentBlueprintId ?? null,
    goalSetAt: goal?.goalSetAt ?? null,
    catOutfitId,
    checkIns,
    pieces: 0,
    updatedAt: Math.max(left.updatedAt, right.updatedAt),
  }
}

export function roomSignature(room: Room) {
  return JSON.stringify({
    id: room.id,
    name: room.name,
    users: [...room.users].map((user) => `${user.id}|${user.name}|${user.color}`).sort(),
    unlockedIds: [...room.unlockedIds].sort(),
    currentBlueprintId: room.currentBlueprintId,
    goalSetAt: room.goalSetAt,
    catOutfitId: room.catOutfitId,
    checkIns: [...room.checkIns]
      .map((entry) => `${checkKey(entry)}|${entry.action}|${entry.blueprintId}|${entry.at}`)
      .sort(),
    pieces: room.pieces,
  })
}

export function newestAdded(previous: Room, next: Room) {
  const keys = new Set(previous.checkIns.map(checkKey))
  return next.checkIns
    .filter((entry) => !keys.has(checkKey(entry)))
    .sort((a, b) => b.at - a.at)[0] ?? null
}
