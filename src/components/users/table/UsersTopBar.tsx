"use client";

import { useTranslations } from "next-intl";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { NewUserButton } from "@/components/layout/NewUserButton";
import { PageHeading } from "@/components/layout/PageHeading";

export function UsersTopBar({ count }: { count: number }) {
  const t = useTranslations("users");

  return (
    <AppTopBar
      heading={<PageHeading title={t("title")} count={count} subtitle={t("subtitle")} />}
      actions={<NewUserButton />}
    />
  );
}
