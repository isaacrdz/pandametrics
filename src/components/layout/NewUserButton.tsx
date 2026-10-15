"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Same look as NewSurveyButton: the primary action of the user list
export function NewUserButton() {
  const t = useTranslations("users");

  return (
    <Button
      asChild
      className="h-11 gap-2 rounded-full bg-highlight px-3 text-[0.95rem] text-highlight-foreground shadow-[0_10px_24px_-12px_var(--highlight)] hover:bg-highlight/90 @3xl:px-5"
    >
      <Link href="/users/new" aria-label={t("new")}>
        <PlusIcon aria-hidden className="size-5" />
        <span className="hidden @3xl:inline">{t("new")}</span>
      </Link>
    </Button>
  );
}
