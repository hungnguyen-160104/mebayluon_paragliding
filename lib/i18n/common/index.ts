import type { Language } from "./types";
import type { CommonTranslation } from "./vi";

import { vi } from "./vi";
import { en } from "./en";
import { fr } from "./fr";
import { ru } from "./ru";
import { zh } from "./zh";
import { hi } from "./hi";

export const translations: Record<Language, CommonTranslation> = {
  vi,
  en,
  fr,
  ru,
  zh,
  hi,
} as const;

export type { Language };
export type TranslationKey = typeof vi;

export const getTranslation = (lang: Language): CommonTranslation =>
  translations[lang] ?? translations.vi;