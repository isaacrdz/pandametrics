import type { Metadata } from "next";
import { UserForm } from "@/components/users/form/UserForm";
import { EMPTY_USER_VALUES } from "@/lib/users/schema";

export const metadata: Metadata = {
  title: "New user · Panda Metrics",
};

// The form renders its own top bar (title and submit button) inside the <form>
export default function NewUserPage() {
  return <UserForm mode="create" defaultValues={EMPTY_USER_VALUES} />;
}
