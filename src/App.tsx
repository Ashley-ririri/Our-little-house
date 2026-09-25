import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Session } from '@supabase/supabase-js'
import { AuthScreen } from './components/AuthScreen'
import { getBlueprint } from './catalog'
import { SidePanel } from './components/SidePanel'
import { RoomScene } from './components/RoomScene'
import { MusicControl } from './components/MusicControl'
import { TimeButton } from './components/TimeButton'
import { Unbox } from './components/Unbox'
import { Welcome } from './components/Welcome'
import { inviteLink, supabase } from './lib/supabaseClient'
import { formatTime, periodOf, todayStamp, type Period } from './time'
import { useLobby } from './useLobby'
import type { Presence, Room, User } from './types'

const ORDER = ['real', 'dawn', 'day', 'dusk', 'night'] as const

function isOnline(user: User, meId: string, presence: Record<string, Presence>, now: number) {
  if (user.id === meId) return true
  const item = presence[user.id]
  return Boolean(item && now - item.at < 8000)
}

function captionFor(
  room: Room,
  me: User,
  presence: Record<string, Presence>,
  now: number,
  t: (key: string, options?: Record<string, string>) => string,
) {
  const others = room.users.filter((user) => user.id !== me.id)
  if (others.length === 0) return t('seatEmpty')
  const online = others.filter((user) => isOnline(user, me.id, presence, now))
  const busy = online.find((user) => presence[user.id]?.status.startsWith('focus:'))
  if (busy) {
    const itemId = presence[busy.id].status.slice('focus:'.length)
    return `${busy.name} ${t('statusFocus', { name: t(`${itemId}Name`) })}`
  }
  const resting = online.find((user) => presence[user.id]?.status === 'rest')
  if (resting) return t('restingNow', { name: resting.name })
  if (online[0]) return t('alsoHere', { name: online[0].name })
  return t('away', { name: others[0].name })
}

function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return
    let alive = true
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])
  return session
}

export default function App() {
  const { t } = useTranslation()
  const session = useSession()
  if (supabase && session === undefined) {
    return (
      <div className="shell">
        <section className="panel">
          <p className="hint">{t('authBusy')}</p>
        </section>
      </div>
    )
  }
  if (supabase && !session) return <AuthScreen />
  return <Home userId={session?.user.id ?? null} />
}

function Home({ userId }: { userId: string | null }) {
  const { t } = useTranslation()
  const lobby = useLobby(userId)
  const signOut = userId ? () => { void supabase?.auth.signOut() } : undefined
  const [preview, setPreview] = useState<(typeof ORDER)[number]>('real')
  const [copied, setCopied] = useState(false)
  const now = new Date(lobby.nowMs)
  const actual = periodOf(now)
  const period: Period = preview === 'real' ? actual : preview
  const cycle = () => setPreview((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])

  if (!lobby.room || !lobby.me) {
    return (
      <Welcome
        room={lobby.room}
        doorNote={lobby.doorNote}
        entryCode={lobby.entryCode}
        period={period}
        preview={preview !== 'real'}
        time={formatTime(now)}
        month={now.getMonth() + 1}
        day={now.getDate()}
        onCycle={cycle}
        onCreate={lobby.createHome}
        onPick={lobby.pickUser}
        onJoin={lobby.joinNew}
        onSignOut={signOut}
      />
    )
  }

  const { room, me } = lobby
  const blueprint = lobby.notice?.type === 'complete' ? getBlueprint(lobby.notice.blueprintId) : undefined

  return (
    <div className="shell" data-period={period}>
      <SidePanel
        room={room}
        me={me}
        today={todayStamp(now)}
        notice={lobby.notice}
        copied={copied}
        onChoose={lobby.chooseGoal}
        onOutfit={lobby.setOutfit}
        onCheckIn={(moduleId, action) => {
          lobby.checkIn(moduleId, action)
          lobby.setActivity(action === 'rest' ? 'rest' : 'idle')
        }}
        onFocus={() => {
          const goal = room.currentBlueprintId ? getBlueprint(room.currentBlueprintId) : undefined
          if (goal) lobby.setActivity(`focus:${goal.id}`)
        }}
        onRelease={lobby.releaseActivity}
        onCopy={() => {
          const text = room.inviteCode ? inviteLink(room.inviteCode) : room.id
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          })
        }}
        onLeave={lobby.leave}
        onSignOut={signOut}
        onReset={() => {
          if (window.confirm(t('confirmReset'))) lobby.resetHome()
        }}
      />
      <RoomScene
        period={period}
        unlockedIds={room.unlockedIds}
        catOutfitId={room.catOutfitId}
        month={now.getMonth() + 1}
        day={now.getDate()}
        caption={captionFor(room, me, lobby.presence, lobby.nowMs, t)}
        chrome={
          <header className="topbar">
            <div className="identity">
              <p className="eyebrow">{room.inviteCode ? t('inviteCode', { code: room.inviteCode }) : t('roomCode', { id: room.id })}</p>
              <h1>{room.name}</h1>
              <div className="people">
                {room.users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={isOnline(user, me.id, lobby.presence, lobby.nowMs) ? 'pill on' : 'pill'}
                    onClick={() => lobby.patUser(user.id)}
                  >
                    <i style={{ background: user.color }} />
                    {user.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="top-tools">
              <MusicControl />
              <TimeButton period={period} preview={preview !== 'real'} time={formatTime(now)} onCycle={cycle} />
            </div>
          </header>
        }
      />
      {lobby.pat && <p className="pat-note">{lobby.pat}</p>}
      {lobby.notice?.type === 'complete' && blueprint && (
        <Unbox blueprint={blueprint} text={lobby.notice.text} onClose={lobby.clearNotice} />
      )}
    </div>
  )
}
