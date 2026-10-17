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
      <div
        className={columns === 3 ? "grid gap-3 sm:grid-cols-3" : columns === 2 ? "grid gap-6 sm:grid-cols-2" : "grid gap-6"}
      >
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
        {/* User details: one field per row */}
        <SectionSkeleton fields={3} columns={1} />
        <SectionSkeleton fields={2} columns={2} />
        <SectionSkeleton fields={3} columns={3} />
      </div>
    </div>
  );
}

// Profile fallback: the profile's top bar (submit disabled), the picture card on top and two
// sections, so nothing moves when the form streams in
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
      <div role="status" aria-label={tCommon("loading")} className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        {/* The picture card on top, like the page */}
        <div className="overflow-hidden rounded-3xl border border-card-border bg-card">
          <div className="h-24 bg-muted sm:h-28" />
          <div className="flex flex-col gap-4 px-5 pb-6 sm:px-8 sm:pb-8">
            <Skeleton className="-mt-12 size-24 rounded-full ring-4 ring-card sm:-mt-14 sm:size-28" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <SectionSkeleton fields={3} columns={1} />
        <SectionSkeleton fields={2} columns={2} />
      </div>
    </div>
  );
}
