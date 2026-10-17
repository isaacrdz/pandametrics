import { NavUser } from "@/components/layout/NavUser";
import { listUserInvitations } from "@/lib/invitations/service";
import { getAccountContext } from "@/server/app-context";

// The signed-in user in the sidebar footer. Reads the session, so the layout renders it inside
// Suspense (NavUserSkeleton)
export async function SidebarUser() {
  const { user, plan } = await getAccountContext();
  const invitations = await listUserInvitations(user.id);
  return (
    <NavUser name={user.name} email={user.email} image={user.image} planTier={plan.tier} invitationCount={invitations.length} />
  );
}
