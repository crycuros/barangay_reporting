import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enCommon from '@/public/locales/en/common.json'
import tlCommon from '@/public/locales/tl/common.json'

const resources = {
  en: {
    common: enCommon,
  },
  tl: {
    common: tlCommon,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: ['common'],
    defaultNS: 'common',
    supportedLngs: ['en', 'tl'],
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    initImmediate: false,
  })
  .catch((error) => {
    console.error('i18n initialization failed:', error)
  })

export default i18n
