"use client";

import { useTranslations } from "next-intl";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { PageHeading } from "@/components/layout/PageHeading";

// count is left out while it loads, so the bar shows right away
export function InvitationsTopBar({ count }: { count?: number }) {
  const t = useTranslations("invitations");
  return <AppTopBar heading={<PageHeading title={t("title")} count={count} subtitle={t("subtitle")} />} />;
}
