"use client";

import { useTranslations } from "next-intl";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { InviteUserButton, type InviteState } from "@/components/layout/InviteUserButton";
import { PageHeading } from "@/components/layout/PageHeading";

// count and invite are left out while they load (the page streams them in), so the bar shows
// right away
export function UsersTopBar({ count, invite }: { count?: number; invite?: InviteState }) {
  const t = useTranslations("users");

  return (
    <AppTopBar
      heading={<PageHeading title={t("title")} count={count} subtitle={t("subtitle")} />}
      actions={invite && <InviteUserButton invite={invite} />}
    />
  );
}
