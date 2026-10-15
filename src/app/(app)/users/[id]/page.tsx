import { GreetingTopBar } from "@/components/layout/GreetingTopBar";
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { UserForm } from "@/components/users/form/UserForm";
import { UserFormSkeleton } from "@/components/users/form/UserFormSkeleton";
import { getAppContext } from "@/lib/dashboard";
import { toUserFormValues } from "@/lib/users/schema";
import { getUser } from "@/lib/users/service";

export const metadata: Metadata = {
  title: "Edit user · Panda Metrics",
};

// params is runtime data under Cache Components, so it is read inside Suspense
async function EditUserContent({ params }: Pick<PageProps<"/users/[id]">, "params">) {
  const { id } = await params;
  const { user: currentUser, organization } = getAppContext();
  // Your own user is edited from the profile, which has no permissions or status
  if (id === currentUser.id) redirect("/profile");
  // Plain user without the password hash; unknown, deleted or another organization's id is a 404
  const user = getUser(organization.id, id);
  if (!user) notFound();

  return (
    <UserForm
      mode="edit"
      defaultValues={toUserFormValues(user)}
      meta={{ id: user.id, role: user.role, isActive: user.isActive }}
    />
  );
}

export default function EditUserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <>
      {/* The page header; outside Suspense, so it is part of the static shell */}
      <GreetingTopBar />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <Suspense fallback={<UserFormSkeleton />}>
          <EditUserContent params={params} />
        </Suspense>
      </div>
    </>
  );
}
