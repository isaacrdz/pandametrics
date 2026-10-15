"use client";

import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface KioskMessageProps {
  kind: "notFound" | "closed";
  code: string;
}

// The code is valid but does not lead to a survey that takes answers
export function KioskMessage({ kind, code }: KioskMessageProps) {
  const t = useTranslations("kiosk.message");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t(`${kind}.title`)}</h1>
        <p className="text-muted-foreground">{t(`${kind}.description`, { code })}</p>
      </div>
      <Button asChild className="h-11 w-fit gap-2 rounded-xl px-6 text-[0.95rem] font-semibold">
        <Link href="/s">
          {t("tryAnother")}
          <ArrowRightIcon aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
