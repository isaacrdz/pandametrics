# Internationalization Spec

## Overview

Add English and Spanish to Panda Metrics with next-intl and a language switcher in the top bar. English is the default. The choice is stored in the browser's `localStorage`, and URLs never change with the language. Every user-facing string in the app moves to message files. Full research, key list and code samples in `docs/i18n.md`.

## Decisions (from the research)

- **No locale in the URL**: no `[locale]` segment, no `/en` or `/es` prefix, no `proxy.ts`; `next/link` and `next/navigation` stay as they are
- **`localStorage`** key `panda-metrics:locale` with `"en"` (default) or `"es"`; missing, invalid or blocked storage means English
- **Client-side locale**: a client `LocaleProvider` (next-intl without i18n routing) reads `localStorage` with `useSyncExternalStore` (server snapshot `en`) and wraps the app in `NextIntlClientProvider`
- **The server always renders English** (`src/i18n/request.ts` returns `en`): components that render translated text are Client Components; Server Components fetch data and pass props
- **No flash of English**: inline script in `<head>` hides the body (`locale-pending`) until Spanish is applied, with a 3-second safety timeout
- **Formatting locales** `en-US` and `es-MX`; timezone `America/Mexico_City` set explicitly, independent of the language
- **Both message files bundled** on the client for instant switching
- **User content is not translated** (survey names, descriptions, questions, option labels, organization and user names)

## Requirements

### Setup

- `yarn add next-intl`
- `src/i18n/config.ts`: `LOCALES = ["en", "es"]`, `AppLocale`, `DEFAULT_LOCALE = "en"`, `STORAGE_KEY = "panda-metrics:locale"`, `TIME_ZONE`, `INTL_LOCALES = { en: "en-US", es: "es-MX" }`, `isLocale()`
- `src/i18n/request.ts`: `getRequestConfig` that always returns the default locale (`en-US`), `TIME_ZONE` and `en.json` (no cookies, headers or params)
- `src/i18n/LocaleProvider.tsx` (client):
  - Reads the locale with `useSyncExternalStore`, subscribing to the `storage` event and a custom change event.
  - Wraps children in `NextIntlClientProvider` with `INTL_LOCALES[locale]`, the messages for that locale and `TIME_ZONE`.
  - Exposes `useAppLocale()` → `{ locale, setLocale }`. `setLocale` writes `localStorage` inside try/catch and dispatches the change event.
  - Keeps `document.documentElement.lang` in sync and removes the `locale-pending` class.
- `src/i18n/locale-script.ts`: inline script that, before paint, reads `localStorage` and, if the value is not the default, sets `lang` and adds `locale-pending` (removed after 3 s at most)
- `next.config.ts`: wrap the config with `createNextIntlPlugin("./src/i18n/request.ts")`, keeping the existing options
- `src/global.d.ts`: augment `AppConfig` with `Locale: "en-US" | "es-MX"` and `Messages: typeof en.json`
- `src/messages/en.json` and `src/messages/es.json` with the full key list from `docs/i18n.md` section 5

### Root layout

- `src/app/layout.tsx`: `lang="en"`, `<script>` with `LOCALE_SCRIPT` in `<head>`, `LocaleProvider` wrapping `ThemeProvider`, `TooltipProvider` and `Toaster`; metadata in English
- `src/app/globals.css`: `.locale-pending body { visibility: hidden; }`

### Server → Client split

- Add `'use client'` to `StatCards`, `SurveyCard`, `SurveyGrid`, `CreateSurveyCallout` and `DashboardSkeleton` (props unchanged)
- `dashboard/page.tsx` stays a Server Component (reads `searchParams`, calls `getDashboardData`); its headings, empty state and footer move to client components (`DashboardSection`, `DashboardFooter`)
- `TopBar` stays a Server Component; the "New survey" button moves to a client `NewSurveyButton`
- `src/lib/dashboard.ts` and `src/lib/mock-data.ts` stay server-only; only computed props cross to the client

### Copy migration

- Remove every `COPY` constant and inline string; use `useTranslations` and `useFormatter`
- Layout: `NavMain`, `NavUser`, `TopBar` / `NewSurveyButton`, `Greeting` (ICU `select` on `period`, full date with `format.dateTime(date, { dateStyle: "full" })`), `OrganizationSwitcher`
- Dashboard: `DashboardSection`, `DashboardFooter`, `StatCards` (remaining spots with ICU plural), `CollectionsToolbar`, `SurveyGrid` (no-results with `{query}`), `SurveyCard`, `SurveyResults` ("Question {current} of {total}"), `CopyButton`, `CreateSurveyCallout`, `DashboardSkeleton`, `charts.ts` (archived label, bar label), `StarRow` (stars plural)
- shadcn: `sidebar.tsx` ("Toggle Sidebar", sheet title and description) and `sheet.tsx` ("Close") with `useTranslations("a11y")`; add a comment that they are generated files with a local change

### Formatting

- `src/lib/format.ts` keeps only `getInitials` and `normalizeSearch`; numbers, percentages, counts and dates go through `useFormatter` and `t("common.responses", { count })`
- Rating average with one decimal through the formatter
- `src/lib/date-range.ts`: `RANGE_OPTIONS` keeps only the values; labels from `t(\`dateRange.${key}\`)`

### Language switcher

- `src/components/layout/LanguageSwitcher.tsx` (client), styled like `OrganizationSwitcher`:
  - Trigger: outline `rounded-full` button with `LanguagesIcon` and the active code (`EN` / `ES`, icon only below `sm`), `aria-label` "Language: English" / "Idioma: Español".
  - Menu: label "Language" / "Idioma", items "English" and "Español" in their own language with `lang="en"` / `lang="es"` and a check on the active one.
- Placed in `TopBar` between `OrganizationSwitcher` and "New survey"
- Switching calls `setLocale` from `useAppLocale()`: no navigation, so the path, `?q=`, `?range=` and scroll are kept

### Guards and docs

- Enable `react/jsx-no-literals` for `src/app/**` and `src/components/**` (excluding `src/components/ui/**`), allowing symbols such as `·` and `/`
- `scripts/check-messages.ts` that fails when `en.json` and `es.json` have different keys; run it as part of `yarn lint`
- `context/coding-standars.md`: add an "Internationalization" section with these rules:
  - All user-facing text goes through next-intl, with ICU plurals and no concatenation.
  - Translated text is rendered in Client Components; Server Components fetch data.
  - Numbers and dates are formatted through `useFormatter`.
  - The locale lives in `localStorage` and defaults to `en`.
  - User content is never translated.

## Verification

- `yarn lint` (including the message key check), `tsc` and `yarn build` pass; `/dashboard` stays partial prerender with no `blocking-route` or `blocking-prerender-current-time` warnings in dev
- Fresh browser (empty `localStorage`): `/dashboard` is fully English ("Total responses", "Active surveys", "Your surveys", "Tuesday, October 13, 2026", `3,062`)
- Switching to Spanish changes every string in place ("Respuestas totales", "Tus encuestas", "martes, 13 de octubre de 2026"), sets `<html lang="es">`, and keeps the URL, `?q=`, `?range=` and scroll
- Reload after choosing Spanish: Spanish with no visible flash of English; a second open tab follows the change
- Invalid value or blocked `localStorage`: English, no errors in the console
- No raw keys and no leftovers of the other language; survey names and questions stay as stored
- Plurals: "1 response" / "2 responses", "One spot remaining" / "Queda 1 lugar disponible", "Limit reached" / "Límite alcanzado"
- Layout checked at desktop and 500px in both languages

## References

- @context/screenshots/selector-language-example.png
- @docs/i18n.md
- @context/project-overview.md
- @context/coding-standars.md
- @next.config.ts
- @src/app/layout.tsx
- @src/app/(app)/layout.tsx
- @src/app/(app)/dashboard/page.tsx
- @src/components/layout/TopBar.tsx
- @src/components/layout/OrganizationSwitcher.tsx
- @src/lib/format.ts
- @src/lib/date-range.ts
- `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`
- next-intl documentation (context7 `/amannn/next-intl`): usage without i18n routing, `NextIntlClientProvider`, TypeScript, formatting
