import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfilePictureCard } from "@/components/users/ProfilePictureCard";
import { UserForm } from "@/components/users/form/UserForm";
import { ProfileFormSkeleton } from "@/components/users/form/UserFormSkeleton";
import { getAccountContext } from "@/server/app-context";
import { getInitials } from "@/lib/format";
import { toUserFormValues } from "@/lib/users/schema";
import { hasPassword } from "@/lib/users/service";

export const metadata: Metadata = {
  title: "My profile · Panda Metrics",
};

// The signed-in user only (from the session); plain values, never the password hash. The session is
// request data, so it is read inside Suspense: a navigation shows the skeleton at once
async function ProfileContent() {
  // Works without an organization too (a new account on its way to /welcome)
  const { user, role } = await getAccountContext();
  // Google-only accounts set a first password instead of changing one
  const mode = (await hasPassword(user.id)) ? "profile" : "profileSetPassword";

  // The form renders its own top bar inside the <form>, then the 4 / 8 grid with this card
  return (
    <UserForm
      // A new mode (after setting a first password) starts a fresh form with its own rules
      key={mode}
      mode={mode}
      defaultValues={toUserFormValues(user)}
      aside={
        <ProfilePictureCard
          name={user.name ?? user.email ?? ""}
          email={user.email ?? ""}
          role={role}
          image={user.image}
          initials={getInitials(user.name)}
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
