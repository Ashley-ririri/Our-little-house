import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const english = i18n.language.startsWith('en')
  const next = english ? 'zh' : 'en'
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => {
        void i18n.changeLanguage(next)
      }}
    >
      <span className={english ? '' : 'on'}>中</span>
      <span aria-hidden="true"> / </span>
      <span className={english ? 'on' : ''}>EN</span>
    </button>
  )
}
