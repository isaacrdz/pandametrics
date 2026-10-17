"use client";

import type { ReactNode } from "react";
import { CheckIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ComingSoonButton } from "@/components/plans/ComingSoonButton";
import { PlanBadge } from "@/components/plans/PlanBadge";
import { BUSINESS_SEATS, PLAN_LIMITS } from "@/lib/plans/limits";
import type { PlanState, PlanType } from "@/lib/plans/plan";

const CARD_CLASS = "rounded-3xl border border-card-border bg-card p-6 sm:p-8";

function LimitList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-foreground">
          <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{children}</dd>
    </div>
  );
}

// Settings → Plan (docs/subscriptions.md, section 8.1): what the user has, its limits and dates.
// No payment provider yet, so Upgrade and Renew are "coming soon"; plans are set with
// scripts/data/set-plan.ts. The Business members card comes with phase 5
export function PlanSettings({ plan }: { plan: PlanState }) {
  const t = useTranslations("plan");
  const format = useFormatter();

  const limitItems = (tier: "FREE" | "PRO", type?: PlanType) => {
    const planLimits = PLAN_LIMITS[tier];
    return [
      t("limits.activeSurveys", { count: planLimits.activeSurveys }),
      t("limits.invites", { count: planLimits.invites }),
      ...(type === "BUSINESS" ? [t("limits.seats", { count: BUSINESS_SEATS })] : []),
    ];
  };

  const date = (value: Date | null) => (value ? format.dateTime(value, { dateStyle: "long" }) : t("details.none"));
  const planName = plan.planType ? t("name", { type: t(`types.${plan.planType}`) }) : t("free.title");

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="current-plan-title" className={CARD_CLASS}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t("current")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="current-plan-title" className="text-2xl font-bold text-foreground">
                  {planName}
                </h2>
                <PlanBadge tier={plan.tier} />
              </div>
              <p className="max-w-xl text-muted-foreground">
                {plan.source === "SEAT"
                  ? plan.ownerName
                    ? t("member.description", { owner: plan.ownerName })
                    : t("member.descriptionNoName")
                  : plan.tier === "FREE"
                    ? t("free.description")
                    : plan.tier === "EXPIRED"
                      ? t("owner.expired")
                      : t("owner.description")}
              </p>
            </div>
            {plan.isPlanOwner && (plan.tier === "EXPIRED" || plan.status === "CANCELED") && (
              <ComingSoonButton className="h-11 gap-2 px-5">
                <RefreshCwIcon aria-hidden />
                {t("renew")}
              </ComingSoonButton>
            )}
          </div>

          {plan.planType && (
            <dl className="grid gap-5 border-t border-card-border pt-6 sm:grid-cols-3">
              {plan.isPlanOwner && plan.billingInterval && (
                <Detail label={t("details.interval")}>{t(`intervals.${plan.billingInterval}`)}</Detail>
              )}
              {plan.isPlanOwner && <Detail label={t("details.lastPayment")}>{date(plan.paidAt)}</Detail>}
              <Detail
                label={
                  plan.tier === "EXPIRED"
                    ? t("details.expiredOn")
                    : plan.status === "CANCELED" || !plan.isPlanOwner
                      ? t("details.endsOn")
                      : t("details.renewsOn")
                }
              >
                {date(plan.currentPeriodEnd)}
              </Detail>
            </dl>
          )}

          <div className="flex flex-col gap-3 border-t border-card-border pt-6">
            <h3 className="font-semibold text-foreground">{t("limits.title")}</h3>
            {/* An expired plan has the Free limits until it is renewed */}
            <LimitList items={plan.tier === "PRO" ? limitItems("PRO", plan.planType ?? undefined) : limitItems("FREE")} />
          </div>
        </div>
      </section>

      {plan.tier === "FREE" && (
        <section aria-labelledby="upgrade-title" className="flex flex-col gap-4">
          <h2 id="upgrade-title" className="text-lg font-semibold text-foreground">
            {t("upgrade.title")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(["INDIVIDUAL", "BUSINESS"] as const).map((type) => (
              <div key={type} className={`${CARD_CLASS} flex flex-col gap-5`}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <SparklesIcon aria-hidden className="size-5 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">{t(`upgrade.${type}.title`)}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{t(`upgrade.${type}.description`)}</p>
                </div>
                <LimitList items={limitItems("PRO", type)} />
                <ComingSoonButton className="mt-auto h-11 w-full">{t("upgrade.action")}</ComingSoonButton>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
