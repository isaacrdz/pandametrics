import { GreetingTopBar } from "@/components/layout/GreetingTopBar";
import type { Metadata } from "next";
import { UserForm } from "@/components/users/form/UserForm";
import { EMPTY_USER_VALUES } from "@/lib/users/schema";

export const metadata: Metadata = {
  title: "New user · Panda Metrics",
};

export default function NewUserPage() {
  return (
    <>
      {/* The page header; outside Suspense, so it is part of the static shell */}
      <GreetingTopBar />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <UserForm mode="create" defaultValues={EMPTY_USER_VALUES} />
      </div>
    </>
  );
}
