import { NavUser } from "@/components/layout/NavUser";
import { listUserInvitations } from "@/lib/invitations/service";
import { getAccountContext } from "@/server/app-context";

// The signed-in user in the sidebar footer, with the organization they are working in and the menu
// to switch, create or leave one. Reads the session, so the layout renders it inside Suspense
// (NavUserSkeleton)
export async function SidebarUser() {
  const { user, plan, organizations, organization, ownsOrganization } = await getAccountContext();
  const invitations = await listUserInvitations(user.id);
  return (
    <NavUser
      name={user.name}
      email={user.email}
      image={user.image}
      planTier={plan.tier}
      invitationCount={invitations.length}
      organizationMenu={{
        organizations,
        currentId: organization?.id ?? null,
        canCreate: !ownsOrganization,
        // Members can leave; an owner never leaves their own organization
        canLeave: organization !== null && organization.ownerId !== user.id,
        // Leaving the Business owner's organization also leaves their plan
        leavesPlanOf: plan.source === "SEAT" && organization?.ownerId === plan.ownerId ? (plan.ownerName ?? "") : null,
      }}
    />
  );
}
