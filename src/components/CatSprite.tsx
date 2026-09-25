import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export type CatState =
  | 'idle'
  | 'walking'
  | 'sleeping'
  | 'waking_up'
  | 'stretching'
  | 'jumping'
  | 'sitting'
  | 'fetching'

const REACTIONS = ['stretching', 'jumping', 'sitting', 'fetching'] as const

type Strip = { src: string; frames: number; w: number; h: number; duration: string }

const STRIPS: Record<CatState, Strip> = {
  idle: { src: '/sprites/cat-idle.png?v=2', frames: 8, w: 89, h: 85, duration: '1s' },
  walking: { src: '/sprites/cat-walking.png?v=2', frames: 8, w: 104, h: 87, duration: '0.56s' },
  sleeping: { src: '/sprites/cat-sleeping.png?v=2', frames: 8, w: 96, h: 64, duration: '1.4s' },
  waking_up: { src: '/sprites/cat-stretching.png?v=4', frames: 5, w: 85, h: 91, duration: '0.7s' },
  stretching: { src: '/sprites/cat-stretching.png?v=4', frames: 5, w: 85, h: 91, duration: '0.7s' },
  jumping: { src: '/sprites/cat-jumping.png?v=4', frames: 6, w: 80, h: 115, duration: '0.48s' },
  sitting: { src: '/sprites/cat-sitting.png?v=2', frames: 8, w: 93, h: 93, duration: '1s' },
  fetching: { src: '/sprites/cat-walking.png?v=2', frames: 8, w: 104, h: 87, duration: '0.28s' },
}

const DINO: Record<CatState, Strip> = {
  idle: { src: '/sprites/cat-dino-idle.png?v=3', frames: 8, w: 163, h: 182, duration: '1s' },
  walking: { src: '/sprites/cat-dino-walking.png?v=3', frames: 8, w: 136, h: 158, duration: '0.56s' },
  sleeping: { src: '/sprites/cat-dino-sleeping.png?v=3', frames: 8, w: 161, h: 135, duration: '1.4s' },
  waking_up: { src: '/sprites/cat-dino-stretching.png?v=3', frames: 5, w: 263, h: 291, duration: '0.7s' },
  stretching: { src: '/sprites/cat-dino-stretching.png?v=3', frames: 5, w: 263, h: 291, duration: '0.7s' },
  jumping: { src: '/sprites/cat-dino-jumping.png?v=3', frames: 6, w: 214, h: 267, duration: '0.48s' },
  sitting: { src: '/sprites/cat-dino-sitting.png?v=3', frames: 8, w: 204, h: 218, duration: '1s' },
  fetching: { src: '/sprites/cat-dino-walking.png?v=3', frames: 8, w: 136, h: 158, duration: '0.28s' },
}

export function Cat({
  state = 'idle',
  scale = 0.55,
  frame = 0,
  label,
  outfit = null,
  onEngage,
  onRelease,
  onFetch,
}: {
  state?: CatState
  scale?: number
  frame?: number
  label?: string
  outfit?: 'dino' | null
  onEngage?: () => void
  onRelease?: () => void
  onFetch?: (done: () => void) => void
}) {
  const { t } = useTranslation()
  const [reaction, setReaction] = useState<CatState | null>(null)
  const [locked, setLocked] = useState(false)
  const [hop, setHop] = useState(0)
  const timer = useRef(0)
  const hopTimer = useRef(0)
  const shown = reaction ?? state
  const clip = (outfit === 'dino' ? DINO : STRIPS)[shown]
  const drawScale = outfit === 'dino' ? 0.34 : scale
  const width = Math.round(clip.w * drawScale)
  const height = Math.round(clip.h * drawScale)
  const once = shown === 'jumping'
  const stepped = shown === 'idle' || shown === 'walking' || once
  const index = shown === 'idle' ? 0 : once ? hop : ((frame % clip.frames) + clip.frames) % clip.frames

  useEffect(() => () => {
    window.clearTimeout(timer.current)
    window.clearTimeout(hopTimer.current)
  }, [])

  function finish() {
    window.clearTimeout(hopTimer.current)
    setReaction(null)
    setLocked(false)
    setHop(0)
    onRelease?.()
  }

  function play(next: CatState, ms: number) {
    window.clearTimeout(timer.current)
    window.clearTimeout(hopTimer.current)
    setLocked(true)
    setHop(0)
    setReaction(next)
    onEngage?.()
    if (next === 'jumping') {
      const frames = (outfit === 'dino' ? DINO : STRIPS).jumping.frames
      let step = 0
      const rise = () => {
        step += 1
        if (step >= frames) return
        setHop(step)
        hopTimer.current = window.setTimeout(rise, 90)
      }
      hopTimer.current = window.setTimeout(rise, 90)
    }
    timer.current = window.setTimeout(finish, ms)
  }

  function poke() {
    if (locked) return
    if ((reaction ?? state) === 'sleeping') {
      play('waking_up', 2000 + Math.floor(Math.random() * 1000))
      return
    }
    if (onFetch && Math.random() < 0.1) {
      setLocked(true)
      onEngage?.()
      onFetch(() => {
        setLocked(false)
        setHop(0)
        onRelease?.()
      })
      return
    }
    const pool = REACTIONS.filter((item) => item !== 'fetching')
    const next = pool[Math.floor(Math.random() * pool.length)]
    play(next, next === 'jumping' ? 620 : 2000)
  }

  return (
    <button
      type="button"
      className="pixel-cat"
      data-state={shown}
      aria-label={label ?? t('cat')}
      title={t('catTitle')}
      onPointerDown={(event) => {
        event.preventDefault()
        poke()
      }}
      style={{
        width,
        height,
        backgroundImage: `url('${clip.src}')`,
        backgroundSize: `${width * clip.frames}px ${height}px`,
        backgroundPositionX: stepped ? -index * width : undefined,
        backgroundPositionY: 'var(--row)',
        animation: stepped ? 'none' : undefined,
        ['--shift' as string]: `${-width * clip.frames}px`,
        animationDuration: clip.duration,
        animationTimingFunction: `steps(${clip.frames})`,
      }}
    />
  )
}
