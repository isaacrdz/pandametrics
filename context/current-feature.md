# Current Feature: Internationalization

## Status

In Progress

## Goals

### Setup

- next-intl installed; `src/i18n/config.ts` (`en` default, `es`, `STORAGE_KEY = "panda-metrics:locale"`, `INTL_LOCALES` `en-US` / `es-MX`, `TIME_ZONE`, `isLocale`)
- `src/i18n/request.ts` always returns English (no cookies, headers or params); `next.config.ts` wrapped with `createNextIntlPlugin`
- `src/i18n/LocaleProvider.tsx` (client): `useSyncExternalStore` over `localStorage` (server snapshot `en`), `storage` + custom change event, `NextIntlClientProvider`, `useAppLocale()` with `setLocale`, `<html lang>` sync, removes `locale-pending`
- `src/i18n/locale-script.ts` inline in `<head>`: hides the body while a non-default locale is applied (3 s safety timeout); `.locale-pending body { visibility: hidden; }`
- `src/global.d.ts` with typed `Locale` and `Messages`; `src/messages/en.json` and `es.json` with the full key list

### Server → Client split

- `'use client'` on `StatCards`, `SurveyCard`, `SurveyGrid`, `CreateSurveyCallout`, `DashboardSkeleton`
- New client `DashboardSection`, `DashboardFooter` and `NewSurveyButton`; `dashboard/page.tsx` and `TopBar` stay Server Components; mock and `src/lib/dashboard.ts` stay server-only

### Copy and formatting

- No `COPY` constants or inline strings left; layout, dashboard, charts, `StarRow` and shadcn `sidebar.tsx` / `sheet.tsx` use `useTranslations`
- ICU plurals / selects: responses, remaining spots, stars, bar label, greeting, "Question {current} of {total}", no-results `{query}`
- `format.ts` keeps only `getInitials` and `normalizeSearch`; numbers, percentages, average and dates through `useFormatter`; range labels from messages

### Language switcher

- `LanguageSwitcher` (client) in `TopBar` between `OrganizationSwitcher` and "New survey": `LanguagesIcon` + `EN` / `ES` (icon only below `sm`), `aria-label`, items "English" / "Español" with `lang` attribute, flag and check on the active one
- Switches in place with `setLocale` (no navigation; path, `?q=`, `?range=` and scroll kept)

### Guards and docs

- `react/jsx-no-literals` for `src/app/**` and `src/components/**` (not `components/ui`)
- `scripts/check-messages.mjs` (key parity) run by `yarn lint`
- "Internationalization" section in `context/coding-standars.md`

### Verification

- `yarn lint`, `tsc` and `yarn build` pass; `/dashboard` still partial prerender, no `blocking-*` warnings
- Fresh browser: fully English (`3,062`, "Tuesday, October 13, 2026"); switch to Spanish in place with `<html lang="es">`
- Reload in Spanish without a flash of English; second tab follows; invalid / blocked storage falls back to English without errors
- Plurals correct in both languages; desktop and 500px checked in both

## Notes

- Spec: `context/features/i18n-spec.md`. Research with code samples and the full key list: `docs/i18n.md`
- Design reference for the switcher: `context/screenshots/selector-language-example.png` (Duolingo: trigger "SITE LANGUAGE: ENGLISH" + chevron, menu of native language names with a small flag on the left). With two languages, a single-column dropdown is enough. Draw the flags as small inline SVGs (US and Mexico), not emoji (emoji flags do not render on Windows), and keep the native name as the accessible text
- URLs never change with the language; `next/link` and `next/navigation` stay as they are
- The server cannot read `localStorage`: anything rendered by a Server Component stays English, so translated text must live in Client Components
- `localStorage` access always inside try/catch; invalid values mean `en`
- User content (survey names, questions, option labels) is never translated; the mock stays as is
- `sidebar.tsx`, `sheet.tsx` and `use-mobile.ts` are shadcn files with local changes; mark them with a comment
- Server Actions / route handlers that need the language must receive `locale` from the client

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
- **Dashboard View** (2026-10-13): shadcn/ui (Nova, Radix, Lucide) with Panda Metrics theme tokens, `next-themes` (light default) and sonner; app shell with collapsible sidebar (Dashboard, Encuestas, Historial, Configuración) and top bar; `/` redirects to `/dashboard`; stat cards (Respuestas totales, Encuestas activas, Respuestas hoy), search and date range in the URL inside `Suspense`, skeletons and empty states; survey cards with question carousel and Satisfaction / Rating / Poll charts, icon buttons to copy link, copy code and edit; data from `src/lib/mock-data.ts` through `src/lib/dashboard.ts`
