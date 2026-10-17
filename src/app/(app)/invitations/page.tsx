import type { Metadata } from "next";
import { Suspense } from "react";
import { InvitationsTopBar } from "@/components/invitations/InvitationsTopBar";
import { InvitationsView } from "@/components/invitations/InvitationsView";
import { Skeleton } from "@/components/ui/skeleton";
import { listUserInvitations } from "@/lib/invitations/service";
import { getAccountContext } from "@/server/app-context";

export const metadata: Metadata = {
  title: "Invitations · Panda Metrics",
};

// The account level: works without an organization too (someone invited right after signing up)
async function InvitationsContent() {
  const { user } = await getAccountContext();
  return <InvitationsView invitations={await listUserInvitations(user.id)} />;
}

async function InvitationsTopBarWithCount() {
  const { user } = await getAccountContext();
  return <InvitationsTopBar count={(await listUserInvitations(user.id)).length} />;
}

export default function InvitationsPage() {
  return (
    <>
      <Suspense fallback={<InvitationsTopBar />}>
        <InvitationsTopBarWithCount />
      </Suspense>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
        <Suspense fallback={<Skeleton className="h-20 w-full rounded-2xl" />}>
          <InvitationsContent />
        </Suspense>
      </div>
    </>
  );
}
