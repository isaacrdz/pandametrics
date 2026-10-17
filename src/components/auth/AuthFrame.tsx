import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

interface AuthFrameProps {
  children: ReactNode;
  // After the language switcher (/welcome: the signed-in user's menu)
  actions?: ReactNode;
  // Sign in and register: no top bar (no language switcher), the logo centered above the card
  logoAboveCard?: boolean;
}

// Frame of the sign-in, register and welcome pages: a card centered in the remaining height, with
// the logo and language switcher on top (welcome) or only the logo above the card (sign in, register)
export function AuthFrame({ children, actions, logoAboveCard = false }: AuthFrameProps) {
  const card = <div className="w-full max-w-md rounded-3xl border border-card-border bg-card p-6 sm:p-8">{children}</div>;

  if (logoAboveCard) {
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="flex flex-1 flex-col items-center justify-start gap-6 px-4 py-10 sm:justify-center sm:px-8 sm:py-16">
          <Logo href="/" size="md" />
          {card}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {actions}
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center sm:px-8">{card}</main>
    </div>
  );
}
