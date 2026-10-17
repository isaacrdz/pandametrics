"use client";

import { useTranslations } from "next-intl";
import { InvitationList } from "@/components/invitations/InvitationList";
import type { InvitationRow } from "@/lib/invitations/service";

// /welcome: joining an organization someone invited the user to, instead of (or before) creating one
export function PendingInvitationsSection({ invitations }: { invitations: InvitationRow[] }) {
  const t = useTranslations("invitations");
  return (
    <section aria-labelledby="welcome-invitations-title" className="flex flex-col gap-4 border-t border-card-border pt-6">
      <div className="flex flex-col gap-0.5">
        <h2 id="welcome-invitations-title" className="font-semibold text-foreground">
          {t("welcome.title", { count: invitations.length })}
        </h2>
        <p className="text-sm text-muted-foreground">{t("welcome.description")}</p>
      </div>
      <InvitationList invitations={invitations} />
    </section>
  );
}
