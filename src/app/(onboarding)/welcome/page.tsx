import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CreateOrganizationForm } from "@/components/onboarding/CreateOrganizationForm";
import { CreateOrganizationSkeleton } from "@/components/onboarding/CreateOrganizationSkeleton";
import { DEFAULT_AFTER_SIGN_IN } from "@/lib/auth/paths";
import { getAccountContext } from "@/server/app-context";

export const metadata: Metadata = {
  title: "Welcome · Panda Metrics",
};

// The session is request data, so it is read inside Suspense. A user who already owns an
// organization has nothing to create here (pending invitations come with docs/subscriptions.md phase 4)
async function WelcomeContent() {
  const { user, ownsOrganization } = await getAccountContext();
  if (ownsOrganization) redirect(DEFAULT_AFTER_SIGN_IN);
  return <CreateOrganizationForm userName={user.name} />;
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<CreateOrganizationSkeleton />}>
      <WelcomeContent />
    </Suspense>
  );
}
