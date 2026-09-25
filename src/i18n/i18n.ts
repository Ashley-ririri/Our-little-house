import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import zh from './zh'

const stored = localStorage.getItem('lobby-lang')
const lng = stored === 'en' || stored === 'zh' ? stored : 'en'

void i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (language) => {
  localStorage.setItem('lobby-lang', language.startsWith('en') ? 'en' : 'zh')
  document.documentElement.lang = language.startsWith('en') ? 'en' : 'zh-CN'
  document.title = i18n.t('defaultHome')
})

document.documentElement.lang = lng === 'en' ? 'en' : 'zh-CN'
document.title = i18n.t('defaultHome')

export default i18n
