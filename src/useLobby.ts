import { useCallback, useEffect, useRef, useState } from 'react'
import { playChime } from './audio'
import { getBlueprint } from './catalog'
import {
  createRoom,
  makeUser,
  mergeRooms,
  newestAdded,
  pieceText,
  resolveCompletion,
  restLine,
  roomSignature,
  withCheckIn,
  withGoal,
  withOutfit,
  withUser,
} from './logic'
import { createOnlineHome, loadMyRoom, loadOnlineRoom, persistRoom, sendNudge, subscribeRoom } from './cloud'
import i18n from './i18n/i18n'
import { inviteCodeFromPath, supabase } from './lib/supabaseClient'
import { clearHome, clearMe, loadMe, loadRoom, saveMe, saveRoom } from './storage'
import type { ModuleId, Notice, NoticeBody, Presence, Room, User } from './types'

const pathCode = inviteCodeFromPath()

function moduleLabel(id: ModuleId) {
  return i18n.t(id)
}

function isRoom(value: unknown): value is Room {
  if (!value || typeof value !== 'object') return false
  const room = value as Room
  return typeof room.id === 'string' && Array.isArray(room.users) && Array.isArray(room.checkIns) && Array.isArray(room.unlockedIds)
}

function userName(room: Room, userId: string) {
  return room.users.find((user) => user.id === userId)?.name ?? i18n.t('someone')
}

export function useLobby(authUserId: string | null) {
  const [room, setRoom] = useState<Room | null>(() => (pathCode ? null : loadRoom()))
  const [me, setMe] = useState<User | null>(() => {
    if (pathCode) return null
    const saved = loadMe(loadRoom())
    if (authUserId && saved?.id !== authUserId) return null
    return saved
  })
  const [presence, setPresence] = useState<Record<string, Presence>>({})
  const [notice, setNotice] = useState<Notice | null>(null)
  const [doorNote, setDoorNote] = useState<string | null>(null)
  const [pat, setPat] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const roomRef = useRef(room)
  const meRef = useRef(me)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const statusRef = useRef('idle')
  const noticeId = useRef(0)
  roomRef.current = room
  meRef.current = me

  const pushNotice = useCallback((next: NoticeBody) => {
    noticeId.current += 1
    setNotice({ ...next, id: noticeId.current })
    if (next.type === 'piece') playChime('piece')
    else if (next.type === 'rest') playChime('rest')
    else if (next.type === 'complete') playChime('complete')
  }, [])

  const clearNotice = useCallback(() => setNotice(null), [])

  useEffect(() => {
    if (!notice || notice.type === 'complete') return
    const timer = window.setTimeout(() => {
      setNotice((current) => (current?.id === notice.id ? null : current))
    }, 3400)
    return () => window.clearTimeout(timer)
  }, [notice])

  const commit = useCallback((draft: Room, meta?: { kind: 'piece' | 'rest' }) => {
    const current = roomRef.current
    const after = resolveCompletion({ ...draft, updatedAt: Date.now() })
    roomRef.current = after
    saveRoom(after)
    setRoom(after)
    if (after.inviteCode) void persistRoom(after)
    else channelRef.current?.postMessage({ type: 'room', room: after })
    if (!meta || !current?.currentBlueprintId) return
    const completed = !after.currentBlueprintId && after.unlockedIds.includes(current.currentBlueprintId)
    if (completed) {
      pushNotice({ type: 'complete', blueprintId: current.currentBlueprintId, text: i18n.t('lastPieceYou') })
      return
    }
    if (meta.kind === 'rest') {
      pushNotice({ type: 'rest', text: restLine() })
      return
    }
    const blueprint = getBlueprint(after.currentBlueprintId ?? '')
    if (!blueprint) return
    pushNotice({
      type: 'piece',
      pieceIndex: after.pieces - 1,
      text: pieceText(blueprint.name, after.pieces, blueprint.pieces),
    })
  }, [pushNotice])

  const setActivity = useCallback((status: string) => {
    statusRef.current = status
    const mine = meRef.current
    if (!mine) return
    const next: Presence = { userId: mine.id, name: mine.name, status, at: Date.now() }
    setPresence((prev) => ({ ...prev, [mine.id]: next }))
    channelRef.current?.postMessage({ type: 'presence', presence: next })
  }, [])

  const releaseActivity = useCallback(() => {
    if (statusRef.current.startsWith('focus:')) setActivity('idle')
  }, [setActivity])

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!room?.id || !me) return
    const channel = new BroadcastChannel(`lobby-home-${room.id}`)
    channelRef.current = channel

    const postPresence = () => {
      const mine = meRef.current
      if (!mine) return
      const next: Presence = {
        userId: mine.id,
        name: mine.name,
        status: statusRef.current,
        at: Date.now(),
      }
      setPresence((prev) => ({ ...prev, [mine.id]: next }))
      channel.postMessage({ type: 'presence', presence: next })
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; room?: unknown; presence?: Presence; userId?: string }
      if (!data || typeof data !== 'object') return
      if (data.type === 'hello') {
        const current = roomRef.current
        if (current) channel.postMessage({ type: 'room', room: current })
        postPresence()
        return
      }
      if (data.type === 'presence' && data.presence?.userId && data.presence.userId !== meRef.current?.id) {
        const incoming = data.presence
        setPresence((prev) => ({ ...prev, [incoming.userId]: incoming }))
        return
      }
      if (data.type === 'bye' && data.userId) {
        const userId = data.userId
        setPresence((prev) => {
          const next = { ...prev }
          delete next[userId]
          return next
        })
        return
      }
      if (data.type !== 'room' || !isRoom(data.room)) return
      const current = roomRef.current
      if (!current || data.room.id !== current.id) return
      const merged = resolveCompletion(mergeRooms(current, data.room))
      if (roomSignature(merged) === roomSignature(current)) return
      const added = newestAdded(current, merged)
      const completed = Boolean(
        current.currentBlueprintId &&
          merged.unlockedIds.includes(current.currentBlueprintId) &&
          !current.unlockedIds.includes(current.currentBlueprintId),
      )
      roomRef.current = merged
      saveRoom(merged)
      setRoom(merged)
      if (roomSignature(merged) !== roomSignature(resolveCompletion(data.room))) {
        channel.postMessage({ type: 'room', room: merged })
      }
      const actor = added?.userId
      if (completed && current.currentBlueprintId) {
        pushNotice({
          type: 'complete',
          blueprintId: current.currentBlueprintId,
          text: actor && actor !== meRef.current?.id ? i18n.t('lastPieceOther', { name: userName(merged, actor) }) : i18n.t('lastPieceYou'),
        })
        return
      }
      if (
        merged.pieces > current.pieces &&
        current.currentBlueprintId &&
        merged.currentBlueprintId === current.currentBlueprintId &&
        actor
      ) {
        const blueprint = getBlueprint(merged.currentBlueprintId)
        if (!blueprint) return
        pushNotice({
          type: 'piece',
          pieceIndex: merged.pieces - 1,
          text:
            actor === meRef.current?.id
              ? pieceText(blueprint.name, merged.pieces, blueprint.pieces)
              : i18n.t('remoteDone', { name: userName(merged, actor), module: moduleLabel(added.moduleId) }),
        })
        return
      }
      if (added?.action === 'rest' && actor && actor !== meRef.current?.id) {
        pushNotice({ type: 'rest', text: i18n.t('partnerRested', { name: userName(merged, actor) }) })
      }
    }

    channel.addEventListener('message', onMessage)
    channel.postMessage({ type: 'hello' })
    postPresence()
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
      postPresence()
    }, 2500)
    const onLeave = () => channel.postMessage({ type: 'bye', userId: me.id })
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.removeEventListener('beforeunload', onLeave)
      channel.removeEventListener('message', onMessage)
      window.clearInterval(timer)
      channel.close()
      if (channelRef.current === channel) channelRef.current = null
    }
  }, [room?.id, me, pushNotice])

  useEffect(() => {
    if (!pathCode) return
    if (!supabase) {
      setDoorNote(i18n.t('doorNeedKey'))
      return
    }
    let stop = false
    void loadOnlineRoom(pathCode).then((next) => {
      if (stop) return
      if (!next) {
        setDoorNote(i18n.t('doorMissing'))
        return
      }
      roomRef.current = next
      setRoom(next)
      const member = authUserId ? next.users.find((user) => user.id === authUserId) : null
      const saved = member ?? loadMe(next)
      if (saved && (!authUserId || saved.id === authUserId)) {
        meRef.current = saved
        saveMe(saved)
        setMe(saved)
      }
    })
    return () => {
      stop = true
    }
  }, [authUserId])

  useEffect(() => {
    const current = room
    if (!current?.inviteCode || !supabase) return
    return subscribeRoom(
      current,
      () => {
        const code = roomRef.current?.inviteCode
        if (!code) return
        void loadOnlineRoom(code).then((next) => {
          const mine = roomRef.current
          if (!next || !mine || next.id !== mine.id) return
          if (roomSignature(next) === roomSignature(mine)) return
          const added = newestAdded(mine, next)
          const completed = Boolean(
            mine.currentBlueprintId &&
              next.unlockedIds.includes(mine.currentBlueprintId) &&
              !mine.unlockedIds.includes(mine.currentBlueprintId),
          )
          roomRef.current = next
          saveRoom(next)
          setRoom(next)
          const actor = added?.userId
          if (!actor || actor === meRef.current?.id) return
          if (completed && mine.currentBlueprintId) {
            pushNotice({
              type: 'complete',
              blueprintId: mine.currentBlueprintId,
              text: i18n.t('lastPieceOther', { name: userName(next, actor) }),
            })
            return
          }
          if (added.action === 'done' && next.pieces > mine.pieces) {
            pushNotice({
              type: 'piece',
              pieceIndex: Math.max(0, next.pieces - 1),
              text: i18n.t('remoteDone', { name: userName(next, actor), module: moduleLabel(added.moduleId) }),
            })
            return
          }
          if (added.action === 'rest') {
            pushNotice({ type: 'rest', text: i18n.t('partnerRested', { name: userName(next, actor) }) })
          }
        })
      },
      (fromName, toUserId) => {
        if (toUserId !== meRef.current?.id) return
        setPat(i18n.t('patReceived', { name: fromName }))
        window.setTimeout(() => setPat((currentPat) => (currentPat?.includes(fromName) ? null : currentPat)), 2800)
      },
    )
  }, [room?.id, room?.inviteCode, pushNotice])

  useEffect(() => {
    if (!authUserId || !supabase || pathCode) return
    let stop = false
    void loadMyRoom(authUserId).then((found) => {
      if (stop) return
      if (found) {
        roomRef.current = found.room
        meRef.current = found.me
        saveRoom(found.room)
        saveMe(found.me)
        setRoom(found.room)
        setMe(found.me)
        setDoorNote(null)
        window.history.replaceState(null, '', `/room/${found.room.inviteCode}`)
        return
      }
      const local = roomRef.current
      if (local && !local.users.some((user) => user.id === authUserId)) {
        roomRef.current = null
        meRef.current = null
        clearHome()
        setRoom(null)
        setMe(null)
      }
    })
    return () => {
      stop = true
    }
  }, [authUserId])

  const createHome = useCallback((roomName: string, myName: string) => {
    const user = makeUser(myName, 0, authUserId ?? undefined)
    if (supabase) {
      void createOnlineHome(roomName, user).then((next) => {
        if (!next?.inviteCode) {
          setDoorNote(i18n.t('doorFailed'))
          return
        }
        roomRef.current = next
        meRef.current = user
        saveRoom(next)
        saveMe(user)
        setRoom(next)
        setMe(user)
        setDoorNote(null)
        window.history.replaceState(null, '', `/room/${next.inviteCode}`)
      })
      return
    }
    const next = createRoom(roomName, user)
    roomRef.current = next
    meRef.current = user
    saveRoom(next)
    saveMe(user)
    setRoom(next)
    setMe(user)
  }, [authUserId])

  const pickUser = useCallback((userId: string) => {
    const user = roomRef.current?.users.find((item) => item.id === userId)
    if (!user) return
    meRef.current = user
    saveMe(user)
    setMe(user)
  }, [])

  const joinNew = useCallback((name: string) => {
    const current = roomRef.current
    if (!current) return
    const existing = authUserId ? current.users.find((user) => user.id === authUserId) : null
    if (existing) {
      meRef.current = existing
      saveMe(existing)
      setMe(existing)
      return
    }
    const user = makeUser(name, current.users.length, authUserId ?? undefined)
    meRef.current = user
    saveMe(user)
    setMe(user)
    commit(withUser(current, user))
  }, [authUserId, commit])

  const setOutfit = useCallback((outfitId: string | null) => {
    const current = roomRef.current
    if (!current) return
    const next = withOutfit(current, outfitId)
    if (!next || next === current) return
    commit(next)
  }, [commit])

  const chooseGoal = useCallback((blueprintId: string) => {
    const current = roomRef.current
    if (!current) return
    const next = withGoal(current, blueprintId)
    if (!next) return
    commit(next)
    const blueprint = getBlueprint(blueprintId)
    if (blueprint) pushNotice({ type: 'info', text: i18n.t('goalSet', { name: i18n.t(`${blueprint.id}Name`) }) })
  }, [commit, pushNotice])

  const checkIn = useCallback((moduleId: ModuleId, action: 'done' | 'rest') => {
    const current = roomRef.current
    const mine = meRef.current
    if (!current || !mine) return
    const result = withCheckIn(current, { userId: mine.id, moduleId, action })
    if ('error' in result) return
    commit(result.room, { kind: result.kind })
  }, [commit])

  const patUser = useCallback((userId: string) => {
    const current = roomRef.current
    const mine = meRef.current
    if (!current?.inviteCode || !mine || userId === mine.id) return
    const other = current.users.find((user) => user.id === userId)
    if (!other) return
    void sendNudge(current.id, mine, userId)
    pushNotice({ type: 'info', text: i18n.t('patSent', { name: other.name }) })
  }, [pushNotice])

  const leave = useCallback(() => {
    channelRef.current?.postMessage({ type: 'bye', userId: meRef.current?.id })
    clearMe()
    meRef.current = null
    setMe(null)
  }, [])

  const resetHome = useCallback(() => {
    clearHome()
    roomRef.current = null
    meRef.current = null
    setRoom(null)
    setMe(null)
    setNotice(null)
  }, [])

  return {
    room,
    me,
    presence,
    notice,
    doorNote,
    pat,
    nowMs,
    createHome,
    pickUser,
    joinNew,
    chooseGoal,
    setOutfit,
    checkIn,
    setActivity,
    releaseActivity,
    leave,
    resetHome,
    clearNotice,
    patUser,
    entryCode: pathCode,
  }
}
