"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import "./i18n"

export type Language = "en" | "tl"
const STORAGE_KEY = "brgy_lang"

type LanguageContextType = {
  lang: Language
  setLang: (l: Language) => void
  t: (key: string) => string
}

const defaultContext: LanguageContextType = {
  lang: "tl",
  setLang: () => {},
  t: (k) => k,
}

const LanguageContext = createContext<LanguageContextType>(defaultContext)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n, t, ready } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null
      if (stored === "en" || stored === "tl") {
        i18n.changeLanguage(stored)
      } else if (typeof navigator !== "undefined" && navigator.language?.startsWith("en")) {
        i18n.changeLanguage("en")
      }
    } catch {}
    setMounted(true)
  }, [i18n])

  const setLang = (l: Language) => {
    i18n.changeLanguage(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {}
  }

  // Don't render until i18n is ready and component is mounted
  if (!ready || !mounted) {
    return <div className="min-h-screen bg-background animate-pulse" />
  }

  return (
    <LanguageContext.Provider value={{ 
      lang: (i18n.language as Language) || "en", 
      setLang, 
      t 
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
