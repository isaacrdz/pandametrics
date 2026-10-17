"use client";

import { useTranslations } from "next-intl";
import type { PlanTier } from "@/lib/plans/plan";
import { cn } from "@/lib/utils";

const TONE: Record<PlanTier, string> = {
  PRO: "bg-accent text-primary",
  FREE: "bg-muted text-muted-foreground",
  EXPIRED: "bg-destructive/10 text-destructive",
};

// "Pro", "Free" or "Expired": the user's plan in the sidebar, the profile and Settings → Plan
export function PlanBadge({ tier, className }: { tier: PlanTier; className?: string }) {
  const t = useTranslations("plan.badge");

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE[tier],
        className,
      )}
    >
      {t(tier)}
    </span>
  );
}
