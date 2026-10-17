import type { Metadata } from "next";
import { Suspense } from "react";
import { DeleteAccountSection } from "@/components/users/DeleteAccountSection";
import { ProfilePictureCard } from "@/components/users/ProfilePictureCard";
import { UserForm } from "@/components/users/form/UserForm";
import { ProfileFormSkeleton } from "@/components/users/form/UserFormSkeleton";
import { getAccountContext } from "@/server/app-context";
import { getInitials } from "@/lib/format";
import { getAccountDeletionInfo } from "@/lib/users/delete-account";
import { toUserFormValues } from "@/lib/users/schema";
import { hasPassword } from "@/lib/users/service";

export const metadata: Metadata = {
  title: "My profile · Panda Metrics",
};

// The signed-in user only (from the session); plain values, never the password hash. The session is
// request data, so it is read inside Suspense: a navigation shows the skeleton at once
async function ProfileContent() {
  // Works without an organization too (a new account on its way to /welcome)
  const { user, organization, role, plan } = await getAccountContext();
  // Only accounts that signed up with email and password change one; Google sign-ups have none
  const [withPassword, deletion] = await Promise.all([hasPassword(user.id), getAccountDeletionInfo(user.id)]);
  const mode = withPassword ? "profile" : "profileNoPassword";

  // The form renders its own top bar inside the <form>, then the 4 / 8 grid with this card
  return (
    <UserForm
      // A new mode (the password removed by a Google takeover) starts a fresh form with its own rules
      key={mode}
      mode={mode}
      defaultValues={toUserFormValues(user)}
      footer={<DeleteAccountSection info={deletion} />}
      aside={
        <ProfilePictureCard
          name={user.name ?? user.email ?? ""}
          organizationName={organization?.name ?? null}
          role={role}
          plan={plan}
          image={user.image}
          initials={getInitials(user.name, user.email)}
          canChangePhoto={withPassword}
        />
      }
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFormSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
