import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BLUEPRINTS, MODULES, PIECE_TONES, getBlueprint } from '../catalog'
import { findCheckIn } from '../logic'
import type { ModuleId, Notice, Room, User } from '../types'
import { ItemArt } from './ItemArt'
import { LanguageToggle } from './LanguageToggle'

function columnsFor(count: number) {
  if (count <= 4) return 2
  if (count === 6) return 3
  if (count === 8 || count === 12) return 4
  return 3
}

export function SidePanel({
  room,
  me,
  today,
  notice,
  onChoose,
  onOutfit,
  onCheckIn,
  onFocus,
  onRelease,
  onCopy,
  copied,
  onLeave,
  onSignOut,
  onReset,
}: {
  room: Room
  me: User
  today: string
  notice: Notice | null
  onChoose: (id: string) => void
  onOutfit: (id: string | null) => void
  onCheckIn: (moduleId: ModuleId, action: 'done' | 'rest') => void
  onFocus: (moduleId: ModuleId) => void
  onRelease: () => void
  onCopy: () => void
  copied: boolean
  onLeave: () => void
  onSignOut?: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const blueprint = room.currentBlueprintId ? getBlueprint(room.currentBlueprintId) : undefined
  const shop = BLUEPRINTS.filter((item) => !room.unlockedIds.includes(item.id))
  const [arrived, setArrived] = useState<number | null>(null)
  const [pulse, setPulse] = useState(false)
  const toast = notice && notice.type !== 'complete' ? notice : null

  useEffect(() => {
    if (notice?.type === 'piece') setArrived(notice.pieceIndex)
  }, [notice])

  useEffect(() => {
    if (arrived === null || notice?.type !== 'piece') return
    setPulse(true)
    const timer = window.setTimeout(() => setPulse(false), 800)
    return () => window.clearTimeout(timer)
  }, [arrived, notice])

  const left = blueprint ? blueprint.pieces - room.pieces : 0
  const hint = blueprint ? t(`${blueprint.id}Hint`) : ''
  const remain = !blueprint
    ? ''
    : room.pieces === 0
      ? t('goalEmpty', { count: blueprint.pieces, hint })
      : left === 1
        ? t('goalLast', { hint })
        : t('goalLeft', { left, hint })

  const mineSettled = MODULES.every((mod) => findCheckIn(room, me.id, mod.id, today))

  return (
    <aside className="panel">
      <LanguageToggle />
      <AnimatePresence mode="wait">
        {toast && (
          <motion.p
            key={toast.id}
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast.text}
          </motion.p>
        )}
      </AnimatePresence>

      {room.unlockedIds.includes('dino') && (
        <div className="wardrobe">
          <img src="/sprites/cat-dino-wear.png" alt="" />
          <div>
            <strong>{t('dinoName')}</strong>
            <p>{room.catOutfitId === 'dino' ? t('wearing') : t('folded')}</p>
          </div>
          <button type="button" className="btn" onClick={() => onOutfit(room.catOutfitId === 'dino' ? null : 'dino')}>
            {room.catOutfitId === 'dino' ? t('takeOff') : t('putOn')}
          </button>
        </div>
      )}

      {blueprint ? (
        <>
          <div className="goal-head">
            <div>
              <p className="eyebrow">{t('assembling')}</p>
              <h2>{t(`${blueprint.id}Name`)}</h2>
            </div>
            <p className="count" aria-live="polite">
              <strong>{room.pieces}</strong>
              <span>/{blueprint.pieces}</span>
            </p>
          </div>
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${(room.pieces / blueprint.pieces) * 100}%` }} />
          </div>
          <p className="hint">{remain}</p>
          <div className={`puzzle${pulse ? ' pulse' : ''}`} aria-label={t('puzzleProgress', { have: room.pieces, need: blueprint.pieces })}>
            <ItemArt id={blueprint.id} className="puzzle-art" />
            <div
              className="puzzle-grid"
              style={{ gridTemplateColumns: `repeat(${columnsFor(blueprint.pieces)}, 1fr)` }}
            >
              {Array.from({ length: blueprint.pieces }, (_, index) => {
                const filled = index < room.pieces
                const fresh = filled && index === arrived
                const tone = PIECE_TONES[index % PIECE_TONES.length]
                return (
                  <motion.div
                    key={index}
                    className={filled ? 'cell on' : 'cell'}
                    initial={fresh ? { y: 72, scale: 0.35, opacity: 0 } : false}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    style={filled ? { background: `color-mix(in srgb, ${tone} 82%, white)` } : undefined}
                  />
                )
              })}
            </div>
          </div>
          <div className="section-label">
            <h3>{t('today')}</h3>
            <p>{mineSettled ? t('allSettled') : t('onePieceEach')}</p>
          </div>
          {MODULES.map((mod) => {
            const mine = findCheckIn(room, me.id, mod.id, today)
            return (
              <div
                key={mod.id}
                className="module"
                role="group"
                aria-label={t(mod.id)}
                onMouseEnter={() => onFocus(mod.id)}
                onMouseLeave={onRelease}
              >
                <div className="module-top">
                  <div>
                    <h3>{t(mod.id)}</h3>
                    <p>{t(`${mod.id}Detail`)}</p>
                  </div>
                  {mine?.action === 'done' && <span className="state">{t('checkedToday')}</span>}
                  {mine?.action === 'rest' && <span className="state rest">{t('restingState')}</span>}
                  {!mine && (
                    <div className="actions">
                      <motion.button
                        type="button"
                        className="btn"
                        whileTap={{ y: 3 }}
                        onFocus={() => onFocus(mod.id)}
                        onBlur={onRelease}
                        onClick={() => onCheckIn(mod.id, 'done')}
                      >
                        {t('doneBtn')}
                      </motion.button>
                      <motion.button
                        type="button"
                        className="btn ghost"
                        whileTap={{ y: 3 }}
                        onFocus={() => onFocus(mod.id)}
                        onBlur={onRelease}
                        onClick={() => onCheckIn(mod.id, 'rest')}
                      >
                        {t('restBtn')}
                      </motion.button>
                    </div>
                  )}
                </div>
                <div className="partner-line">
                  {room.users
                    .filter((user) => user.id !== me.id)
                    .map((user) => {
                      const entry = findCheckIn(room, user.id, mod.id, today)
                      if (!entry) return null
                      return (
                        <small key={user.id}>
                          {entry.action === 'done' ? t('partnerDone', { name: user.name }) : t('partnerRest', { name: user.name })}
                        </small>
                      )
                    })}
                </div>
              </div>
            )
          })}
        </>
      ) : shop.length > 0 ? (
        <>
          <p className="eyebrow">{t('shop')}</p>
          <h2>{room.unlockedIds.length ? t('pickAnother') : t('pickFirst')}</h2>
          <p className="hint">{t('shopHint')}</p>
          <div className="shop">
            {shop.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                className="shop-card"
                whileTap={{ y: 3 }}
                onClick={() => onChoose(item.id)}
              >
                <ItemArt id={item.id} />
                <strong>{t(`${item.id}Name`)}</strong>
                <small>{t('pieceCount', { count: item.pieces })}</small>
                <em>{t(`${item.id}Desc`)}</em>
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <div className="done-home">
          <p className="eyebrow">{t('thisHome')}</p>
          <h2>{t('allHere')}</h2>
          <p className="hint">{t('allHereHint')}</p>
        </div>
      )}

      <footer className="panel-foot">
        <span>{room.inviteCode ? t('inviteCode', { code: room.inviteCode }) : t('roomCodeShort', { id: room.id })}</span>
        <button type="button" onClick={onCopy}>{copied ? t('copied') : room.inviteCode ? t('copyInvite') : t('copyCode')}</button>
        <button type="button" onClick={onLeave}>{t('leave')}</button>
        {onSignOut && <button type="button" onClick={onSignOut}>{t('signOut')}</button>}
        <button type="button" onClick={onReset}>{t('resetHome')}</button>
        <p>{t('footNote')}</p>
      </footer>
    </aside>
  )
}
