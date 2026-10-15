import { GreetingTopBar } from "@/components/layout/GreetingTopBar";
import type { Metadata } from "next";
import { ProfilePictureCard } from "@/components/users/ProfilePictureCard";
import { UserForm } from "@/components/users/form/UserForm";
import { getAppContext } from "@/lib/dashboard";
import { getInitials } from "@/lib/format";
import { toUserFormValues } from "@/lib/users/schema";

export const metadata: Metadata = {
  title: "My profile · Panda Metrics",
};

// The signed-in user only (mock session until Auth.js); plain values, never the password hash
export default function ProfilePage() {
  const { user } = getAppContext();

  return (
    <>
      {/* The page header; outside Suspense, so it is part of the static shell */}
      <GreetingTopBar />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
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
      </div>
    </>
  );
}
