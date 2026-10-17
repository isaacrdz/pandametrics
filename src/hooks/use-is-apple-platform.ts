"use client";

import { useSyncExternalStore } from "react";

interface NavigatorWithUAData extends Navigator {
  userAgentData?: { platform?: string };
}

function readIsApple(): boolean {
  const { userAgentData, platform } = navigator as NavigatorWithUAData;
  return /mac|iphone|ipad|ipod/i.test(userAgentData?.platform || platform || "");
}

const subscribe = () => () => {};

// Mac / iOS (⌘ shortcuts) or not (Ctrl). null on the server and during hydration, so shortcut hints
// render only once the platform is known and never mismatch
export function useIsApplePlatform(): boolean | null {
  return useSyncExternalStore(subscribe, readIsApple, () => null);
}
