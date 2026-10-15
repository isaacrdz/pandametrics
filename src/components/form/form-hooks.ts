import { useEffect } from "react";
import { useTranslations } from "next-intl";

// Browser prompt on reload or tab close while there are unsaved changes.
// App Router has no route-change events, so in-app links are not intercepted.
export function useBeforeUnloadWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}

type ValidationParams = Record<string, number>;

// Zod messages are keys under "validation"; limits are passed as ICU params
export function useValidationMessage() {
  const t = useTranslations("validation");
  const translate = t as unknown as (key: string, values?: ValidationParams) => string;

  return (message: string | undefined, params?: ValidationParams): string | undefined => {
    if (!message) return undefined;
    return t.has(message as Parameters<typeof t.has>[0]) ? translate(message, params) : message;
  };
}
