export type Period = 'dawn' | 'day' | 'dusk' | 'night'

export function todayStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(date)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  let year = Number(pick('year'))
  let month = Number(pick('month'))
  let day = Number(pick('day'))
  const hour = Number(pick('hour') === '24' ? '0' : pick('hour'))
  if (hour < 4) {
    const prev = new Date(Date.UTC(year, month - 1, day))
    prev.setUTCDate(prev.getUTCDate() - 1)
    year = prev.getUTCFullYear()
    month = prev.getUTCMonth() + 1
    day = prev.getUTCDate()
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatTime(date: Date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function periodOf(date: Date): Period {
  const hour = date.getHours()
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

export function periodLabel(period: Period) {
  switch (period) {
    case 'dawn':
      return '清晨'
    case 'day':
      return '白天'
    case 'dusk':
      return '黄昏'
    case 'night':
      return '夜里'
  }
}
