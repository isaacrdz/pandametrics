import type { Metadata } from "next";
import { Suspense } from "react";
import type { InviteState } from "@/components/layout/InviteUserButton";
import { PendingInvitationsCard } from "@/components/users/PendingInvitationsCard";
import { UsersTableSection } from "@/components/users/table/UsersTableSection";
import { UsersTableSkeleton } from "@/components/users/table/UsersTableSkeleton";
import { UsersTopBar } from "@/components/users/table/UsersTopBar";
import { getAppContext, type AppContext } from "@/server/app-context";
import { listOrganizationInvitations } from "@/lib/invitations/service";
import { PLAN_LIMITS } from "@/lib/plans/limits";
import { countListedUsers, listUsers } from "@/lib/users/list";
import { parseUserListParams } from "@/lib/users/list-params";

export const metadata: Metadata = {
  title: "Users · Panda Metrics",
};

// Owners and admins manage people: invitations, editing, deactivating and removing others
const canManageInvitations = ({ role }: AppContext) => role === "OWNER" || role === "ADMIN";

// searchParams is runtime data under Cache Components, so it is read inside Suspense
async function UsersContent({ searchParams }: Pick<PageProps<"/users">, "searchParams">) {
  const params = parseUserListParams(await searchParams);
  const context = await getAppContext();
  const [data, invitations] = await Promise.all([
    listUsers(context.organization.id, context.user.id, params),
    listOrganizationInvitations(context.organization.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {invitations.length > 0 && (
        <PendingInvitationsCard invitations={invitations} canRevoke={canManageInvitations(context)} />
      )}
      <UsersTableSection data={data} params={params} canManage={canManageInvitations(context)} />
    </div>
  );
}

// The invite button: owners and admins of a Pro organization, with the slots used (members besides
// the owner, deactivated ones too, plus pending invitations); a Pro feature otherwise
function inviteStateFor(context: AppContext, members: number, pending: number): InviteState {
  if (!canManageInvitations(context)) return { kind: "hidden" };
  if (context.organizationPlan.tier !== "PRO") return { kind: "pro-required", isOwner: context.role === "OWNER" };
  return { kind: "available", used: Math.max(0, members - 1) + pending, limit: PLAN_LIMITS.PRO.invites };
}

// The count and the invite button need the signed-in user's organization (the session, request
// data). Inside their own Suspense, so a navigation shows the bar at once and they stream in;
// cached and tagged, so they refresh after user and invitation actions
async function UsersTopBarWithCount() {
  const context = await getAppContext();
  const [count, invitations] = await Promise.all([
    countListedUsers(context.organization.id),
    listOrganizationInvitations(context.organization.id),
  ]);
  return <UsersTopBar count={count} invite={inviteStateFor(context, count, invitations.length)} />;
}

export default function UsersPage({ searchParams }: PageProps<"/users">) {
  return (
    <>
      <Suspense fallback={<UsersTopBar />}>
        <UsersTopBarWithCount />
      </Suspense>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Suspense fallback={<UsersTableSkeleton />}>
          <UsersContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
