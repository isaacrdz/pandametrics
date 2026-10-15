"use client";

// Browser-side metadata sent with each kiosk response. Storage can be blocked (private mode,
// kiosk policies), so every access is guarded and falls back to null / LINK.

const DEVICE_ID_KEY = "panda-metrics:device-id";
const ENTRY_KEY = "panda-metrics:kiosk-entry";

// Stable per browser, so the rate limit and the metrics can tell kiosk devices apart
export function getDeviceId(): string | null {
  try {
    const stored = window.localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return null;
  }
}

// The answer is kept per code for the page's lifetime: the runner can mount twice (dev StrictMode,
// the LocaleProvider remount on a non-default language) and must get the same source both times.
// The flag itself is cleared, so a reload of the same URL counts as LINK
const entryByCode = new Map<string, boolean>();

// Set by the code entry right before opening a survey, so the runner can tell a code typed on the
// kiosk (KIOSK) from a shared link opened directly (LINK)
export function markKioskEntry(code: string): void {
  entryByCode.delete(code);
  try {
    window.sessionStorage.setItem(ENTRY_KEY, code);
  } catch {
    // Without storage the response counts as LINK
  }
}

export function takeKioskEntry(code: string): boolean {
  const known = entryByCode.get(code);
  if (known !== undefined) return known;

  let fromKiosk = false;
  try {
    fromKiosk = window.sessionStorage.getItem(ENTRY_KEY) === code;
    window.sessionStorage.removeItem(ENTRY_KEY);
  } catch {
    // Without storage the response counts as LINK
  }
  entryByCode.set(code, fromKiosk);
  return fromKiosk;
}
