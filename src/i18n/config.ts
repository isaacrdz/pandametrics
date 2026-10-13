export const LOCALES = ["en", "es"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

// The choice lives in the browser only; URLs never carry the language
export const STORAGE_KEY = "panda-metrics:locale";

// Independent of the language; later per user / ?tz=
export const TIME_ZONE = "America/Mexico_City";

// Regional codes for Intl so numbers and dates keep the regional format (3,062)
export const INTL_LOCALES = { en: "en-US", es: "es-MX" } as const satisfies Record<AppLocale, string>;

export function isLocale(value: unknown): value is AppLocale {
  return LOCALES.includes(value as AppLocale);
}
