import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CreateOrganizationForm } from "@/components/onboarding/CreateOrganizationForm";
import { CreateOrganizationSkeleton } from "@/components/onboarding/CreateOrganizationSkeleton";
import { PendingInvitationsSection } from "@/components/onboarding/PendingInvitationsSection";
import { listUserInvitations } from "@/lib/invitations/service";
import { DEFAULT_AFTER_SIGN_IN } from "@/lib/auth/paths";
import { getAccountContext } from "@/server/app-context";

export const metadata: Metadata = {
  title: "Welcome · Panda Metrics",
};

// The session is request data, so it is read inside Suspense. A user who already owns an
// organization has nothing to create here (their invitations are on /invitations)
async function WelcomeContent() {
  const { user, ownsOrganization } = await getAccountContext();
  if (ownsOrganization) redirect(DEFAULT_AFTER_SIGN_IN);
  const invitations = await listUserInvitations(user.id);
  return (
    <div className="flex flex-col gap-6">
      <CreateOrganizationForm userName={user.name} />
      {invitations.length > 0 && <PendingInvitationsSection invitations={invitations} />}
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<CreateOrganizationSkeleton />}>
      <WelcomeContent />
    </Suspense>
  );
}
