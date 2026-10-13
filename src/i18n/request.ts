import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, INTL_LOCALES, TIME_ZONE } from "@/i18n/config";

// The server cannot read localStorage, so it always renders the default locale.
// No cookies, headers or params: pages keep their static shell with Cache Components.
export default getRequestConfig(async () => ({
  locale: INTL_LOCALES[DEFAULT_LOCALE],
  timeZone: TIME_ZONE,
  messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
}));
