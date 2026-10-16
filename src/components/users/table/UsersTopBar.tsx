"use client";

import { useTranslations } from "next-intl";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { InviteUserButton } from "@/components/layout/InviteUserButton";
import { PageHeading } from "@/components/layout/PageHeading";

// count is left out while it loads (the page streams it in), so the bar shows right away
export function UsersTopBar({ count }: { count?: number }) {
  const t = useTranslations("users");

  return (
    <AppTopBar
      heading={<PageHeading title={t("title")} count={count} subtitle={t("subtitle")} />}
      actions={<InviteUserButton />}
    />
  );
}
