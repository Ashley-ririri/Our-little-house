import { useTranslation } from 'react-i18next'
import type { Period } from '../time'

export function TimeButton({
  period,
  preview,
  time,
  onCycle,
}: {
  period: Period
  preview: boolean
  time: string
  onCycle: () => void
}) {
  const { t } = useTranslation()
  return (
    <button type="button" className="time-btn" onClick={onCycle} title={t('timeTitle')}>
      <span>{t(period)}{preview ? ` · ${t('preview')}` : ''}</span>
      <strong>{time}</strong>
    </button>
  )
}
