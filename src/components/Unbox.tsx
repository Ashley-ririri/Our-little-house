import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Blueprint } from '../catalog'
import { ItemArt } from './ItemArt'

export function Unbox({
  blueprint,
  text,
  onClose,
}: {
  blueprint: Blueprint
  text: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <motion.div className="unbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {Array.from({ length: 12 }, (_, index) => (
        <motion.span
          key={index}
          className="petal"
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: Math.cos((index / 12) * Math.PI * 2) * 140,
            y: Math.sin((index / 12) * Math.PI * 2) * 100,
          }}
          transition={{ duration: 0.95, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="unbox-card"
        initial={{ scale: 0.86, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <ItemArt id={blueprint.id} className="unbox-art" />
        <p className="eyebrow">{t('unboxed')}</p>
        <h2>{t(`${blueprint.id}Name`)}</h2>
        <p>{text}</p>
        <p className="hint">{t(`${blueprint.id}Hint`)}</p>
        <button type="button" className="btn wide" onClick={onClose}>
          {t('backInside')}
        </button>
      </motion.div>
    </motion.div>
  )
}
