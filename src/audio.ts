let context: AudioContext | null = null

function getContext() {
  const Ctx = window.AudioContext
  if (!Ctx) return null
  if (!context) context = new Ctx()
  if (context.state === 'suspended') void context.resume()
  return context
}

function tone(ctx: AudioContext, frequency: number, when: number, duration: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(0.05, when + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration)
  oscillator.start(when)
  oscillator.stop(when + duration)
}

export function playChime(kind: 'piece' | 'rest' | 'complete') {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  if (kind === 'piece') {
    tone(ctx, 523.25, now, 0.22)
    tone(ctx, 659.25, now + 0.08, 0.28)
  } else if (kind === 'rest') {
    tone(ctx, 392, now, 0.32)
  } else {
    tone(ctx, 523.25, now, 0.2)
    tone(ctx, 659.25, now + 0.1, 0.24)
    tone(ctx, 783.99, now + 0.2, 0.42)
  }
}
