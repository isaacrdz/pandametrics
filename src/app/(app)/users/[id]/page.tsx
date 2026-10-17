import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { UserForm } from "@/components/users/form/UserForm";
import { UserFormSkeleton } from "@/components/users/form/UserFormSkeleton";
import { getAppContext } from "@/server/app-context";
import { toUserFormValues } from "@/lib/users/schema";
import { getUser } from "@/lib/users/service";

export const metadata: Metadata = {
  title: "Edit user · Panda Metrics",
};

// params is runtime data under Cache Components, so it is read inside Suspense
async function EditUserContent({ params }: Pick<PageProps<"/users/[id]">, "params">) {
  const { id } = await params;
  const { user: currentUser, organization, role } = await getAppContext();
  // Your own user is edited from the profile, which has no permissions or status
  if (id === currentUser.id) redirect("/profile");
  // Only the owner and admins edit others, and the owner is edited by nobody else (the service
  // refuses it too)
  if (role === "MEMBER" || id === organization.ownerId) redirect("/users");
  // Plain user without the password hash; unknown, deleted or another organization's id is a 404
  const user = await getUser(organization.id, id);
  if (!user) notFound();

  return (
    <UserForm
      mode="edit"
      defaultValues={toUserFormValues(user)}
      meta={{ id: user.id, role: user.role, isActive: user.isActive }}
    />
  );
}

// The form renders its own top bar inside the <form>; while the user loads, the skeleton shows
// the same bar (static title, disabled submit), so the header never changes
export default function EditUserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <Suspense fallback={<UserFormSkeleton />}>
      <EditUserContent params={params} />
    </Suspense>
  );
}
