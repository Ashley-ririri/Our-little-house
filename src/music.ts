const STORAGE_KEY = 'lobby-music'
const TRACK = '/audio/cozy-game-loop.mp3'
const DEFAULT_VOLUME = 0.15

type Pref = { muted: boolean; volume: number }

let audio: HTMLAudioElement | null = null
let gain: GainNode | null = null
let context: AudioContext | null = null
let wired = false
let playing = false
const listeners = new Set<() => void>()

function clamp(value: number) {
  if (Number.isNaN(value)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, value))
}

function readPref(): Pref {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { muted: false, volume: DEFAULT_VOLUME }
    const parsed = JSON.parse(raw) as Partial<Pref>
    return {
      muted: Boolean(parsed.muted),
      volume: clamp(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_VOLUME),
    }
  } catch {
    return { muted: false, volume: DEFAULT_VOLUME }
  }
}

function writePref(pref: Pref) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))
  listeners.forEach((listener) => listener())
}

function emit() {
  listeners.forEach((listener) => listener())
}

function targetGain() {
  const pref = readPref()
  return pref.muted ? 0 : pref.volume
}

function fadeTo(value: number, seconds = 1.6) {
  if (gain && context) {
    const now = context.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now)
    gain.gain.linearRampToValueAtTime(Math.max(value, 0.0001), now + seconds)
    return
  }
  if (audio) audio.volume = value
}

function ensure() {
  if (audio) return audio
  audio = new Audio(TRACK)
  audio.loop = true
  audio.preload = 'auto'
  const Ctx = window.AudioContext
  if (Ctx && !wired) {
    context = new Ctx()
    const source = context.createMediaElementSource(audio)
    gain = context.createGain()
    gain.gain.value = 0.0001
    source.connect(gain)
    gain.connect(context.destination)
    wired = true
  }
  return audio
}

export function musicSnapshot() {
  const pref = readPref()
  return {
    ...pref,
    playing: Boolean(audio && !audio.paused && !pref.muted),
  }
}

export function subscribeMusic(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function startMusic() {
  const element = ensure()
  if (context?.state === 'suspended') void context.resume()
  const pref = readPref()
  if (playing) {
    fadeTo(targetGain(), 0.4)
    return
  }
  if (pref.muted) return
  playing = true
  element.volume = 1
  fadeTo(0.0001, 0.05)
  void element.play().then(() => {
    playing = true
    fadeTo(readPref().muted ? 0.0001 : readPref().volume, 1.6)
    emit()
  }).catch(() => {
    playing = false
    emit()
  })
  emit()
}

function fadeOutAndPause() {
  fadeTo(0.0001, 0.6)
  window.setTimeout(() => {
    if (!readPref().muted) return
    audio?.pause()
    playing = false
    emit()
  }, 650)
}

function isAudible() {
  return Boolean(audio && !audio.paused && !readPref().muted)
}

export function toggleMusic() {
  const pref = readPref()
  if (isAudible()) {
    writePref({ ...pref, muted: true })
    fadeOutAndPause()
    return
  }
  playing = false
  writePref({ ...pref, muted: false })
  startMusic()
}

export function setMusicVolume(volume: number) {
  const value = clamp(volume)
  writePref({ muted: false, volume: value })
  if (value === 0) {
    fadeTo(0.0001, 0.05)
    return
  }
  if (!playing) startMusic()
  else fadeTo(value, 0.05)
}
