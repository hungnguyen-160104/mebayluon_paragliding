// lib/i18n/pilot-event/index.ts
import { en } from "./en";
import { fr } from "./fr";
import { hi } from "./hi";
import { ru } from "./ru";
import type { PilotDict, PilotLang } from "./types";
import { vi } from "./vi";
import { zh } from "./zh";

export type { PilotDict, PilotLang } from "./types";

export const PILOT_I18N: Record<PilotLang, PilotDict> = {
  vi,
  en,
  fr,
  ru,
  zh,
  hi,
};

const SUPPORTED: PilotLang[] = ["vi", "en", "fr", "ru", "zh", "hi"];

/** Trả bảng chữ theo ngôn ngữ đang xem; ngôn ngữ lạ thì về tiếng Việt. */
export function pilotDict(lang: unknown): PilotDict {
  const code = String(lang ?? "vi").slice(0, 2).toLowerCase() as PilotLang;
  return PILOT_I18N[SUPPORTED.includes(code) ? code : "vi"];
}
