export type ModuleId = 'work' | 'study' | 'sport'

export type User = {
  id: string
  name: string
  color: string
}

export type CheckIn = {
  date: string
  moduleId: ModuleId
  userId: string
  action: 'done' | 'rest'
  at: number
  blueprintId: string
}

export type Room = {
  id: string
  inviteCode?: string
  name: string
  users: User[]
  unlockedIds: string[]
  currentBlueprintId: string | null
  goalSetAt: number | null
  catOutfitId: string | null
  checkIns: CheckIn[]
  pieces: number
  updatedAt: number
}

export type Presence = {
  userId: string
  name: string
  status: string
  at: number
}

export type NoticeBody =
  | { type: 'piece'; text: string; pieceIndex: number }
  | { type: 'rest'; text: string }
  | { type: 'info'; text: string }
  | { type: 'complete'; text: string; blueprintId: string }

export type Notice = NoticeBody & { id: number }
