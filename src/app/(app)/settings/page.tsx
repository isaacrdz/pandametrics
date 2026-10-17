import { redirect } from "next/navigation";

// Settings has one section for now; the organization's comes later
export default function SettingsPage() {
  redirect("/settings/plan");
}
