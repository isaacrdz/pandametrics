import type { AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// Simplified flags drawn as SVG: emoji flags do not render on Windows
function UnitedStatesFlag() {
  return (
    <svg viewBox="0 0 24 16" className="size-full">
      <rect width="24" height="16" fill="#ffffff" />
      {[0, 2, 4, 6, 8, 10, 12].map((row) => (
        <rect key={row} y={(row * 16) / 13} width="24" height={16 / 13} fill="#b22234" />
      ))}
      <rect width="10.4" height={(16 * 7) / 13} fill="#3c3b6e" />
    </svg>
  );
}

function MexicoFlag() {
  return (
    <svg viewBox="0 0 24 16" className="size-full">
      <rect width="8" height="16" fill="#006847" />
      <rect x="8" width="8" height="16" fill="#ffffff" />
      <rect x="16" width="8" height="16" fill="#ce1126" />
      <circle cx="12" cy="8" r="2" fill="#8c6a3e" />
    </svg>
  );
}

const FLAGS: Record<AppLocale, () => React.JSX.Element> = {
  en: UnitedStatesFlag,
  es: MexicoFlag,
};

interface LanguageFlagProps {
  locale: AppLocale;
  className?: string;
}

export function LanguageFlag({ locale, className }: LanguageFlagProps) {
  const Flag = FLAGS[locale];

  return (
    <span
      aria-hidden
      className={cn("inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10", className)}
    >
      <Flag />
    </span>
  );
}
