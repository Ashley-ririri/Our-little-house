import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Period } from '../time'
import type { Room } from '../types'
import { LanguageToggle } from './LanguageToggle'
import { MusicControl } from './MusicControl'
import { startMusic } from '../music'
import { RoomScene } from './RoomScene'
import { TimeButton } from './TimeButton'

export function Welcome({
  room,
  doorNote,
  entryCode,
  period,
  preview,
  time,
  month,
  day,
  onCycle,
  onCreate,
  onPick,
  onJoin,
  onSignOut,
}: {
  room: Room | null
  doorNote: string | null
  entryCode: string | null
  period: Period
  preview: boolean
  time: string
  month: number
  day: number
  onCycle: () => void
  onCreate: (roomName: string, myName: string) => void
  onPick: (userId: string) => void
  onJoin: (name: string) => void
  onSignOut?: () => void
}) {
  const { t } = useTranslation()
  const [roomName, setRoomName] = useState('')
  const [myName, setMyName] = useState('')
  const [joinName, setJoinName] = useState('')

  return (
    <div className="shell" data-period={period}>
      {room ? (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault()
            if (joinName.trim()) {
              startMusic()
              onJoin(joinName)
            }
          }}
        >
          <LanguageToggle />
          <p className="eyebrow">ENTER</p>
          <h2>{t('whoTitle')}</h2>
          <p className="hint">{t('whoHint')}</p>
          <div className="user-pick">
            {room.users.map((user) => (
              <button key={user.id} type="button" className="btn user-btn" onClick={() => { startMusic(); onPick(user.id) }}>
                <i style={{ background: user.color }} />
                {t('iAm', { name: user.name })}
              </button>
            ))}
          </div>
          <label className="field">
            {t('newName')}
            <input
              value={joinName}
              maxLength={10}
              autoComplete="off"
              placeholder={t('otherName')}
              onChange={(event) => setJoinName(event.target.value)}
            />
          </label>
          <button className="btn wide" type="submit" disabled={!joinName.trim()}>
            {t('enterWithName')}
          </button>
          {onSignOut && (
            <p className="panel-foot">
              <button type="button" onClick={onSignOut}>{t('signOut')}</button>
            </p>
          )}
        </form>
      ) : entryCode ? (
        <section className="panel">
          <LanguageToggle />
          <p className="eyebrow">INVITE</p>
          <h2>{t('inviteCode', { code: entryCode })}</h2>
          <p className="hint">{doorNote ?? t('findingHome')}</p>
        </section>
      ) : (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault()
            if (myName.trim()) {
              startMusic()
              onCreate(roomName, myName)
            }
          }}
        >
          <LanguageToggle />
          <p className="eyebrow">HOME</p>
          <h2>{t('welcomeTitle')}</h2>
          <p className="hint">{doorNote ?? t('welcomeHint')}</p>
          <label className="field">
            {t('homeName')}
            <input
              value={roomName}
              maxLength={16}
              autoComplete="off"
              placeholder={t('homePlaceholder')}
              onChange={(event) => setRoomName(event.target.value)}
            />
          </label>
          <label className="field">
            {t('myName')}
            <input
              required
              value={myName}
              maxLength={10}
              autoComplete="off"
              placeholder={t('namePlaceholder')}
              onChange={(event) => setMyName(event.target.value)}
            />
          </label>
          <button className="btn wide" type="submit" disabled={!myName.trim()}>
            {t('openDoor')}
          </button>
          {onSignOut && (
            <p className="panel-foot">
              <button type="button" onClick={onSignOut}>{t('signOut')}</button>
            </p>
          )}
        </form>
      )}
      <RoomScene
        period={period}
        unlockedIds={room?.unlockedIds ?? []}
        catOutfitId={room?.catOutfitId ?? null}
        month={month}
        day={day}
        caption={room ? t('welcomeBack') : t('systemMsg')}
        chrome={
          <header className="topbar">
            <div>
              <p className="eyebrow">{room ? t('roomCode', { id: room.id }) : t('noNameYet')}</p>
              <h1>{room?.name ?? t('emptyRoom')}</h1>
            </div>
            <div className="top-tools">
              <MusicControl />
              <TimeButton period={period} preview={preview} time={time} onCycle={onCycle} />
            </div>
          </header>
        }
      />
    </div>
  )
}
