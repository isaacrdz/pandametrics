"use client";

import { useTranslations } from "next-intl";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { PageHeading } from "@/components/layout/PageHeading";
import { SubmitButton } from "@/components/layout/top-bar-actions";
import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ fields, columns }: { fields: number; columns: number }) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-card-border bg-card p-5 sm:p-8">
      <div className="flex gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className={columns === 3 ? "grid gap-3 sm:grid-cols-3" : "grid gap-6 sm:grid-cols-2"}>
        {Array.from({ length: fields }, (_, i) => (
          <Skeleton key={i} className={columns === 3 ? "h-24 rounded-2xl" : "h-12 rounded-xl"} />
        ))}
      </div>
    </div>
  );
}

// Edit page fallback: the same top bar the form renders (static title, submit disabled until the
// user loads), so the header does not change when the content streams in
export function UserFormSkeleton() {
  const t = useTranslations("userForm");
  const tForm = useTranslations("form.actions");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col">
      <AppTopBar
        hideSwitchersWhenNarrow
        heading={<PageHeading back={{ href: "/users" }} title={t("editTitle")} subtitle={t("editSubtitle")} />}
        actions={<SubmitButton label={t("actions.save")} pendingLabel={tForm("saving")} pending={false} disabled />}
      />
      <div
        role="status"
        aria-label={tCommon("loading")}
        className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10"
      >
        <SectionSkeleton fields={3} columns={2} />
        <SectionSkeleton fields={2} columns={2} />
        <SectionSkeleton fields={3} columns={3} />
      </div>
    </div>
  );
}

// Profile fallback: the profile's top bar (submit disabled) and the 4 / 8 grid with the picture card
// and two sections, so nothing moves when the form streams in
export function ProfileFormSkeleton() {
  const t = useTranslations("profile");
  const tUser = useTranslations("userForm");
  const tForm = useTranslations("form.actions");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col">
      <AppTopBar
        hideSwitchersWhenNarrow
        heading={<PageHeading back={{ href: "/dashboard" }} title={t("title")} subtitle={t("subtitle")} />}
        actions={<SubmitButton label={tUser("actions.save")} pendingLabel={tForm("saving")} pending={false} disabled />}
      />
      <div role="status" aria-label={tCommon("loading")} className="@container/profile mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <div className="grid items-start gap-8 @4xl/profile:grid-cols-12">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-card-border bg-card p-5 sm:p-8 @4xl/profile:col-span-4">
            <Skeleton className="h-7 w-2/3 self-start" />
            <Skeleton className="size-24 rounded-full @4xl/profile:size-32" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-8 @4xl/profile:col-span-8">
            <SectionSkeleton fields={3} columns={2} />
            <SectionSkeleton fields={2} columns={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
