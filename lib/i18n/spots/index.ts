import type { SpotLanguage } from "./types";
import type { SpotTranslations } from "./schema";

import { vi } from "./vi";
import { en } from "./en";
import { fr } from "./fr";
import { ru } from "./ru";
import { zh } from "./zh";
import { hi } from "./hi";

export type { SpotLanguage } from "./types";
export type { SpotTranslations } from "./schema";

export const spotTranslations: Record<SpotLanguage, SpotTranslations> = {
  vi,
  en,
  fr,
  ru,
  zh,
  hi,
} as const;

export const getSpotTranslation = (lang: SpotLanguage) =>
  spotTranslations[lang] ?? spotTranslations.vi;