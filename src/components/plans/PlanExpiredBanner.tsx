"use client";

import { useState, useSyncExternalStore } from "react";
import { CircleAlertIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useAppShell } from "@/components/layout/AppShellProvider";
import { ComingSoonButton } from "@/components/plans/ComingSoonButton";
import { Button } from "@/components/ui/button";

// Dismissed for this browser session only: it comes back on the next visit
const STORAGE_KEY = "panda-metrics:plan-notice-dismissed";

function readDismissed(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Above every admin page while the user's plan is expired (docs/subscriptions.md, section 8.3).
// A Business member only sees that the owner's plan expired; the plan owner also gets "Renew plan"
// (coming soon until there is a payment provider)
export function PlanExpiredBanner() {
  const { plan } = useAppShell();
  const t = useTranslations("plan.banner");
  const tPlan = useTranslations("plan");
  const format = useFormatter();
  // The server has no sessionStorage: the banner renders, then hides on the client if dismissed
  const stored = useSyncExternalStore(subscribe, readDismissed, () => null);
  const [dismissedNow, setDismissedNow] = useState(false);

  if (plan.tier !== "EXPIRED" || !plan.currentPeriodEnd || !plan.planType) return null;
  // Per subscription and period: renewing and expiring again shows it again
  const noticeKey = `${plan.subscriptionId}:${plan.currentPeriodEnd.toISOString()}`;
  if (dismissedNow || stored === noticeKey) return null;

  const date = format.dateTime(plan.currentPeriodEnd, { dateStyle: "long" });
  const message = plan.isPlanOwner
    ? t("owner", { type: tPlan(`types.${plan.planType}`), date })
    : plan.ownerName
      ? t("member", { owner: plan.ownerName, date })
      : t("memberNoName", { date });

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, noticeKey);
    } catch {
      // Blocked storage: hidden until the next page load
    }
    setDismissedNow(true);
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-sm md:px-8"
    >
      <CircleAlertIcon aria-hidden className="size-4 shrink-0 text-destructive" />
      <p className="min-w-0 flex-1 font-medium text-foreground">{message}</p>
      <div className="flex items-center gap-2">
        {plan.isPlanOwner && (
          <ComingSoonButton className="h-9 gap-2 px-4">
            <RefreshCwIcon aria-hidden />
            {t("renew")}
          </ComingSoonButton>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="size-9 rounded-full text-muted-foreground hover:text-foreground"
        >
          <XIcon aria-hidden />
        </Button>
      </div>
    </div>
  );
}
