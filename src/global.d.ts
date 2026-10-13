import type { INTL_LOCALES } from "@/i18n/config";
import type en from "@/messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof INTL_LOCALES)[keyof typeof INTL_LOCALES];
    Messages: typeof en;
  }
}
