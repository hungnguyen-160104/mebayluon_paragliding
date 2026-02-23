"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { translations, type Language } from "@/lib/translations";
export type { Language };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (typeof translations)[Language];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "language";
const COOKIE_KEY = "language";

function isLanguage(v: unknown): v is Language {
  return typeof v === "string" && v in translations;
}

function readCookie(key: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(key: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAge}; samesite=lax`;
}

function toLang(v: string | null | undefined): Language | null {
  if (!v) return null;
  const s = String(v).toLowerCase();
  const code2 = s.slice(0, 2);
  if (isLanguage(code2)) return code2 as Language; // zh-CN -> zh
  if (isLanguage(s)) return s as Language;
  return null;
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "vi";

  // ưu tiên cookie (đồng bộ với Server Components)
  const fromCookie = toLang(readCookie(COOKIE_KEY));
  if (fromCookie) return fromCookie;

  // fallback localStorage
  const fromStorage = toLang(localStorage.getItem(STORAGE_KEY));
  if (fromStorage) return fromStorage;

  return "vi";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);

    // localStorage + cookie + refresh để server đọc cookie mới
    localStorage.setItem(STORAGE_KEY, lang);
    writeCookie(COOKIE_KEY, lang);
    router.refresh();
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}