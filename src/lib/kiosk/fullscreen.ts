"use client";

import { useSyncExternalStore } from "react";

// Element fullscreen for the kiosk. iPhone Safari has none (document.fullscreenEnabled is false),
// and browsers only allow entering from a user gesture, so every call is best effort.

export function isFullscreenSupported(): boolean {
  return typeof document !== "undefined" && document.fullscreenEnabled === true;
}

export function enterFullscreen(): void {
  if (!isFullscreenSupported() || document.fullscreenElement) return;
  document.documentElement.requestFullscreen().catch(() => undefined);
}

export function exitFullscreen(): void {
  if (typeof document === "undefined" || !document.fullscreenElement) return;
  document.exitFullscreen().catch(() => undefined);
}

function subscribe(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

// Follows Esc and the browser's own controls, not only our toggle
export function useIsFullscreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement !== null,
    () => false,
  );
}

export function useFullscreenSupported(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    isFullscreenSupported,
    () => false,
  );
}
