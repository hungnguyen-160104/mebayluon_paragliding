import { EN_SELECT_FLIGHT_LOCALE } from "./en";
import { FR_SELECT_FLIGHT_LOCALE } from "./fr";
import { HI_SELECT_FLIGHT_LOCALE } from "./hi";
import { RU_SELECT_FLIGHT_LOCALE } from "./ru";
import { VI_SELECT_FLIGHT_LOCALE } from "./vi";
import { ZH_SELECT_FLIGHT_LOCALE } from "./zh";
import type { BookingLang, SelectFlightStepLocale } from "./types";

export type { BookingLang, SelectFlightStepLocale } from "./types";

export const HOMESTAY_URL = "/homestay";

export const SELECT_FLIGHT_STEP_LOCALES: Record<
  BookingLang,
  SelectFlightStepLocale
> = {
  vi: VI_SELECT_FLIGHT_LOCALE,
  en: EN_SELECT_FLIGHT_LOCALE,
  fr: FR_SELECT_FLIGHT_LOCALE,
  ru: RU_SELECT_FLIGHT_LOCALE,
  hi: HI_SELECT_FLIGHT_LOCALE,
  zh: ZH_SELECT_FLIGHT_LOCALE,
};

export function getSelectFlightStepLocale(
  lang: BookingLang,
): SelectFlightStepLocale {
  return SELECT_FLIGHT_STEP_LOCALES[lang] ?? SELECT_FLIGHT_STEP_LOCALES.vi;
}