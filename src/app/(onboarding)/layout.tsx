import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { AccountMenu } from "@/components/onboarding/AccountMenu";
import { getAccountContext } from "@/server/app-context";

// The signed-in user's menu reads the session, so it streams in after the static frame
async function SignedInAccountMenu() {
  const { user } = await getAccountContext();
  return <AccountMenu name={user.name} email={user.email} image={user.image} />;
}

// Pages for a signed-in user without an organization (/welcome): the sign-in frame with the user's
// menu instead of the sidebar
export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AuthFrame
        actions={
          <Suspense fallback={<div aria-hidden className="size-11" />}>
            <SignedInAccountMenu />
          </Suspense>
        }
      >
        {children}
      </AuthFrame>
    </div>
  );
}
