"use client";

import { MailOpenIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { InvitationList } from "@/components/invitations/InvitationList";
import type { InvitationRow } from "@/lib/invitations/service";

// /invitations: the list, or an empty state
export function InvitationsView({ invitations }: { invitations: InvitationRow[] }) {
  const t = useTranslations("invitations");
  if (invitations.length === 0) {
    return <EmptyState icon={MailOpenIcon} title={t("empty.title")} description={t("empty.description")} />;
  }
  return <InvitationList invitations={invitations} />;
}
