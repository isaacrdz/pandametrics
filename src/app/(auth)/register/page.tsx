import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { safeCallbackUrl } from "@/lib/auth/paths";
import { getSessionAccount } from "@/server/app-context";

export const metadata: Metadata = {
  title: "Create your account · Panda Metrics",
};

async function RegisterContent({ searchParams }: Pick<PageProps<"/register">, "searchParams">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  if (await getSessionAccount()) redirect(callbackUrl);
  return <RegisterForm callbackUrl={callbackUrl} />;
}

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return (
    <Suspense fallback={<AuthFormSkeleton fields={4} />}>
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}
