import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

interface AuthFrameProps {
  children: ReactNode;
  // After the language switcher (/welcome: the signed-in user's menu)
  actions?: ReactNode;
}

// Frame of the sign-in, register and welcome pages, like the kiosk's: logo and language switcher on
// top, a card centered in the remaining height
export function AuthFrame({ children, actions }: AuthFrameProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {actions}
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center sm:px-8">
        <div className="w-full max-w-md rounded-3xl border border-card-border bg-card p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
