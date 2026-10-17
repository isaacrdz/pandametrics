"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/search/CommandPalette";

interface CommandPaletteValue {
  openPalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteValue | null>(null);

// Another modal (a confirmation, the invite dialog) or an open menu: ⌘K must not stack the
// palette on top of it
function otherOverlayIsOpen(): boolean {
  return (
    document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]') !==
    null
  );
}

// The element focused before opening (the search button, a table row…). Radix would focus the
// dialog's trigger on close, and the palette has none, so focus goes back here instead
function rememberFocus(ref: { current: HTMLElement | null }) {
  ref.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

// The command palette of the admin app (every page of the (app) layout): ⌘K / Ctrl K toggles it,
// the top bar's search button opens it
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Autofill and password managers send keydown events without a key
      if (typeof event.key !== "string") return;
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.isComposing) return;
      // Browsers use Ctrl K / ⌘K for their own search bar
      event.preventDefault();
      // The palette counts as an overlay too, but when it is the open one the shortcut closes it
      const blocked = otherOverlayIsOpen();
      if (!blocked) rememberFocus(returnFocusRef);
      setOpen((current) => (current ? false : !blocked));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openPalette = useCallback(() => {
    rememberFocus(returnFocusRef);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openPalette }), [openPalette]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} returnFocusRef={returnFocusRef} />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteValue {
  const value = useContext(CommandPaletteContext);
  if (!value) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return value;
}
