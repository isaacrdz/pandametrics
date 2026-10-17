"use client";

import { CheckIcon, ChevronDownIcon, LanguagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageFlag } from "@/components/layout/LanguageFlag";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES } from "@/i18n/config";
import { useAppLocale } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  // Full-width button with the language name, for menus (the landing mobile sheet)
  fullWidth?: boolean;
}

export function LanguageSwitcher({ fullWidth = false }: LanguageSwitcherProps) {
  const t = useTranslations("topBar");
  const tLanguages = useTranslations("languages");
  const { locale, setLocale } = useAppLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {fullWidth ? (
          <Button
            variant="outline"
            aria-label={t("languageLabel", { name: tLanguages(locale) })}
            className="h-11 w-full justify-start gap-2 rounded-xl bg-card px-4 text-[0.95rem] font-normal shadow-xs"
          >
            <LanguagesIcon aria-hidden className="text-muted-foreground" />
            <span className="font-medium">{tLanguages(locale)}</span>
            <ChevronDownIcon aria-hidden className="ml-auto text-muted-foreground" />
          </Button>
        ) : (
          // Compact: a 44px circle with the language code, the same height as the bar's other buttons
          <Button
            variant="outline"
            aria-label={t("languageLabel", { name: tLanguages(locale) })}
            className="size-11 rounded-full bg-card p-0 text-sm font-semibold shadow-xs"
          >
            <span aria-hidden lang={locale} className="uppercase">
              {locale}
            </span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("min-w-48 rounded-xl", fullWidth && "w-(--radix-dropdown-menu-trigger-width)")}>
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        {LOCALES.map((option) => (
          <DropdownMenuItem
            key={option}
            lang={option}
            onSelect={() => setLocale(option)}
            className="gap-3 py-2"
          >
            <LanguageFlag locale={option} />
            {tLanguages(option)}
            {option === locale && <CheckIcon aria-hidden className="ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
