"use client";

import { useEffect, useSyncExternalStore } from "react";

// Whether the visitor is signed in, for the landing's account buttons. The landing is prerendered,
// so the session arrives later from one small streamed component (LandingSession) instead of
// making the page dynamic. Until then, and on the server, the buttons show the signed-out state

let signedIn = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLandingSignedIn(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => signedIn,
    () => false,
  );
}

// Rendered by LandingSession once the session is known. Renders nothing
export function LandingSessionSignal({ signedIn: value }: { signedIn: boolean }) {
  useEffect(() => {
    signedIn = value;
    listeners.forEach((listener) => listener());
  }, [value]);
  return null;
}
