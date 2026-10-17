import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanSettings } from "@/components/plans/PlanSettings";
import { PlanSettingsSkeleton } from "@/components/plans/PlanSettingsSkeleton";
import { PlanTopBar } from "@/components/plans/PlanTopBar";
import { getAccountContext } from "@/server/app-context";

export const metadata: Metadata = {
  title: "Plan · Panda Metrics",
};

// The account level: works without an organization too. The session is request data, so the plan
// streams in under the static top bar
async function PlanContent() {
  const { plan } = await getAccountContext();
  return <PlanSettings plan={plan} />;
}

export default function PlanPage() {
  return (
    <>
      <PlanTopBar />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <Suspense fallback={<PlanSettingsSkeleton />}>
          <PlanContent />
        </Suspense>
      </div>
    </>
  );
}
