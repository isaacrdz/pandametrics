import type { Metadata } from "next";
import { ProfilePictureCard } from "@/components/users/ProfilePictureCard";
import { UserForm } from "@/components/users/form/UserForm";
import { getAppContext } from "@/server/app-context";
import { getInitials } from "@/lib/format";
import { toUserFormValues } from "@/lib/users/schema";

export const metadata: Metadata = {
  title: "My profile · Panda Metrics",
};

// The signed-in user only (from the session); plain values, never the password hash
export default async function ProfilePage() {
  const { user } = await getAppContext();

  // The form renders its own top bar inside the <form>, then the 4 / 8 grid with this card
  return (
    <UserForm
      mode="profile"
      defaultValues={toUserFormValues(user)}
      aside={
        <ProfilePictureCard
          name={user.name ?? user.email ?? ""}
          email={user.email ?? ""}
          role={user.role}
          image={user.image}
          initials={getInitials(user.name)}
        />
      }
    />
  );
}
