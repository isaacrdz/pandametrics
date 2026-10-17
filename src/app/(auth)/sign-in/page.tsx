import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";
import { SignInForm } from "@/components/auth/SignInForm";
import { safeCallbackUrl } from "@/lib/auth/paths";
import { getSessionAccount } from "@/server/app-context";

export const metadata: Metadata = {
  title: "Sign in · Panda Metrics",
};

// searchParams and the session are request data, so they are read inside Suspense
async function SignInContent({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  // Already signed in (and still allowed in): straight to the app, which sends a user without an
  // organization on to /welcome. A session of a deactivated user is ignored here, so it never
  // bounces between this page and the dashboard
  if (await getSessionAccount()) redirect(callbackUrl);

  return (
    <SignInForm
      callbackUrl={callbackUrl}
      initialError={typeof params.error === "string" ? params.error : null}
      notice={params.deleted === "1" ? "accountDeleted" : params.registered === "1" ? "registered" : null}
    />
  );
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}
