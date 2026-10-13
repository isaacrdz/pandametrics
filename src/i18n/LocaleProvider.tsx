"use client";

import {
  createContext,
  Fragment,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  DEFAULT_LOCALE,
  INTL_LOCALES,
  STORAGE_KEY,
  TIME_ZONE,
  isLocale,
  type AppLocale,
} from "@/i18n/config";
import { LOCALE_PENDING_CLASS } from "@/i18n/locale-script";
import en from "@/messages/en.json";
import es from "@/messages/es.json";

// Both languages are bundled so switching is instant
const MESSAGES = { en, es };

const CHANGE_EVENT = "panda-metrics:locale-change";

// Used only when localStorage is blocked (private mode, browser policies),
// so switching still works until the next reload
let memoryLocale: AppLocale | null = null;

function getStoredLocale(): AppLocale {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    return memoryLocale ?? DEFAULT_LOCALE;
  }
}

function getServerLocale(): AppLocale {
  return DEFAULT_LOCALE;
}

function subscribe(onChange: () => void) {
  // "storage" fires in other tabs; the custom event covers this tab
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getStoredLocale, getServerLocale);

  // The server HTML is always in the default locale. Streamed Suspense boundaries that hydrate
  // after the switch would not match it, so the first time the locale differs from the server's
  // the tree is mounted again on the client instead of hydrated. English visitors never remount.
  const [divergedFromServer, setDivergedFromServer] = useState(false);
  if (!divergedFromServer && locale !== DEFAULT_LOCALE) {
    setDivergedFromServer(true);
  }

  const setLocale = useCallback((next: AppLocale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      memoryLocale = next;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  useEffect(() => {
    // Right after hydration React still renders the server locale (en) before switching to
    // the stored one; revealing the page then would flash English for one frame
    if (locale !== getStoredLocale()) return;
    document.documentElement.lang = locale;
    document.documentElement.classList.remove(LOCALE_PENDING_CLASS);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext value={value}>
      <NextIntlClientProvider
        locale={INTL_LOCALES[locale]}
        messages={MESSAGES[locale]}
        timeZone={TIME_ZONE}
      >
        <Fragment key={divergedFromServer ? "client" : "server"}>{children}</Fragment>
      </NextIntlClientProvider>
    </LocaleContext>
  );
}

export function useAppLocale(): LocaleContextValue {
  const context = use(LocaleContext);
  if (!context) throw new Error("useAppLocale must be used inside LocaleProvider");
  return context;
}
