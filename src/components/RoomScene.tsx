import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Period } from '../time'
import { Cat, type CatState } from './CatSprite'

type Spot = { kind: CatState; x: number; y: number; face: 1 | -1; frame: number }

const HOME = { kind: 'idle' as const, x: 48, y: 70 }

function faceOf(fromX: number, toX: number): 1 | -1 {
  return toX < fromX ? -1 : 1
}

function Sprite({
  src,
  alt,
  className,
  z,
}: {
  src: string
  alt: string
  className: string
  z: number
}) {
  return <img className={`sprite ${className}`} src={src} alt={alt} style={{ zIndex: z }} />
}

export function RoomScene({
  period,
  unlockedIds,
  catOutfitId,
  month,
  day,
  caption,
  chrome,
}: {
  period: Period
  unlockedIds: string[]
  catOutfitId: string | null
  month: number
  day: number
  caption: string
  chrome?: ReactNode
}) {
  const { t } = useTranslation()
  const [spot, setSpot] = useState<Spot>({ ...HOME, face: 1, frame: 0 })
  const hasCarpet = unlockedIds.includes('carpet')
  const hasTree = unlockedIds.includes('tree')
  const hasRecord = unlockedIds.includes('record')
  const hold = useRef(false)
  const timerRef = useRef(0)
  const walkGen = useRef(0)
  const spotRef = useRef(spot)
  const planRef = useRef<() => void>(() => {})
  const fetchRef = useRef<(done: () => void) => void>((done) => done())
  spotRef.current = spot

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const frames = 8
    const stops = [
      { x: 40, y: 72 },
      { x: 56, y: 71 },
      { x: 48, y: 68 },
    ]
    const place = (next: Spot) => {
      spotRef.current = next
      setSpot(next)
    }
    const plan = () => {
      if (hold.current) {
        timerRef.current = window.setTimeout(plan, 4000)
        return
      }
      const from = spotRef.current
      const roll = Math.random()
      const to = hasTree && roll < 0.25
        ? { x: 57, y: 69 }
        : hasCarpet && roll < 0.45
          ? { x: 44, y: 72 }
          : stops[Math.floor(Math.random() * stops.length)]
      const kind: CatState = hasTree && roll < 0.25 ? 'sleeping' : hasCarpet && roll < 0.45 ? 'sitting' : 'idle'
      const face = faceOf(from.x, to.x)
      const dist = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(4, Math.round(dist / 1.15))
      const id = ++walkGen.current
      let step = 0
      const tick = () => {
        if (id !== walkGen.current || hold.current) return
        step += 1
        const t = step / steps
        if (t >= 1) {
          place({ kind, x: to.x, y: to.y, face, frame: 0 })
          timerRef.current = window.setTimeout(plan, 3200)
          return
        }
        place({
          kind: 'walking',
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          face,
          frame: step % frames,
        })
        timerRef.current = window.setTimeout(tick, 130)
      }
      place({ ...from, kind: 'walking', face, frame: 0 })
      timerRef.current = window.setTimeout(tick, 130)
    }
    planRef.current = plan
    timerRef.current = window.setTimeout(plan, 2400)

    const walkLeg = (
      from: Spot,
      to: { x: number; y: number },
      then: () => void,
    ) => {
      const face = faceOf(from.x, to.x)
      const dist = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(4, Math.round(dist / 1.15))
      const id = ++walkGen.current
      let step = 0
      const tick = () => {
        if (id !== walkGen.current) return
        step += 1
        if (step >= steps) {
          place({ kind: 'idle', x: to.x, y: to.y, face, frame: 0 })
          then()
          return
        }
        place({
          kind: 'walking',
          x: from.x + (to.x - from.x) * (step / steps),
          y: from.y + (to.y - from.y) * (step / steps),
          face,
          frame: step % frames,
        })
        timerRef.current = window.setTimeout(tick, 130)
      }
      place({ kind: 'walking', x: from.x, y: from.y, face, frame: 0 })
      timerRef.current = window.setTimeout(tick, 130)
    }

    fetchRef.current = (done) => {
      const start = spotRef.current
      const dir = start.x > 50 ? -1 : 1
      const away = { x: Math.min(60, Math.max(36, start.x + dir * 7)), y: start.y }
      walkLeg(start, away, () => {
        timerRef.current = window.setTimeout(() => {
          walkLeg(spotRef.current, { x: start.x, y: start.y }, () => {
            place({ kind: 'idle', x: start.x, y: start.y, face: faceOf(away.x, start.x), frame: 0 })
            done()
          })
        }, 700)
      })
    }
    return () => {
      walkGen.current += 1
      window.clearTimeout(timerRef.current)
    }
  }, [hasCarpet, hasTree])

  return (
    <section className="lobby" data-period={period}>
      {chrome}
      <div className="iso-room">
        <div className="room-stage">
        <img className="room-bg" src="/sprites/room.png" alt={t('roomAlt')} />
        <div className="calendar-sprite">
          <span>{t('month', { month })}</span>
          <strong>{day}</strong>
        </div>
        {hasRecord && <Sprite src="/sprites/record.png" alt={t('recordName')} className="sprite-record" z={5} />}
        {hasCarpet && <Sprite src="/sprites/carpet.png" alt={t('carpetName')} className="sprite-carpet" z={4} />}
        {hasTree && <Sprite src="/sprites/tree.png" alt={t('treeName')} className="sprite-tree" z={6} />}
        <div
          className="cat-slot"
          style={{ left: `${spot.x}%`, top: `${spot.y}%`, zIndex: 8, ['--face' as string]: spot.face }}
        >
          <Cat
            state={spot.kind}
            frame={spot.frame}
            outfit={catOutfitId === 'dino' ? 'dino' : null}
            onEngage={() => {
              hold.current = true
              walkGen.current += 1
              window.clearTimeout(timerRef.current)
            }}
            label={catOutfitId === 'dino' ? t('catDino') : t('cat')}
            onFetch={(done) => fetchRef.current(done)}
            onRelease={() => {
              hold.current = false
              walkGen.current += 1
              setSpot((current) => {
                const next = { ...current, kind: 'idle' as const, frame: 0 }
                spotRef.current = next
                return next
              })
              window.clearTimeout(timerRef.current)
              timerRef.current = window.setTimeout(() => planRef.current(), 4000)
            }}
          />
        </div>
        </div>
      </div>
      <p className="scene-caption">{caption}</p>
    </section>
  )
}
