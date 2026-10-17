"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// A one-shot URL param (links from the command palette: `?invite=1`, `?name=`): calls `onValue`
// once with its value, then drops it from the URL so a reload or Back does not repeat it. Reads
// search params, so the component using it must render inside Suspense
export function useConsumeSearchParam(name: string, onValue: (value: string) => void) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const value = searchParams.get(name);
  const onValueRef = useRef(onValue);
  const consumed = useRef<string | null>(null);

  useEffect(() => {
    onValueRef.current = onValue;
  });

  useEffect(() => {
    if (value === null || consumed.current === value) return;
    consumed.current = value;
    onValueRef.current(value);

    const rest = new URLSearchParams(searchParams.toString());
    rest.delete(name);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [name, value, pathname, router, searchParams]);
}
