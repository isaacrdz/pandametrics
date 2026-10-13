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

export function LanguageSwitcher() {
  const t = useTranslations("topBar");
  const tLanguages = useTranslations("languages");
  const { locale, setLocale } = useAppLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={t("languageLabel", { name: tLanguages(locale) })}
          className="h-11 gap-2 rounded-full bg-card px-3 text-[0.95rem] font-normal shadow-xs sm:px-4"
        >
          <LanguagesIcon aria-hidden className="text-muted-foreground" />
          <span className="hidden font-medium uppercase sm:inline">{locale}</span>
          <ChevronDownIcon aria-hidden className="hidden text-muted-foreground sm:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 rounded-xl">
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
