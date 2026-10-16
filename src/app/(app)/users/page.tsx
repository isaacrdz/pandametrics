import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersTableSection } from "@/components/users/table/UsersTableSection";
import { UsersTableSkeleton } from "@/components/users/table/UsersTableSkeleton";
import { UsersTopBar } from "@/components/users/table/UsersTopBar";
import { getAppContext } from "@/server/app-context";
import { countListedUsers, listUsers } from "@/lib/users/list";
import { parseUserListParams } from "@/lib/users/list-params";

export const metadata: Metadata = {
  title: "Users · Panda Metrics",
};

// searchParams is runtime data under Cache Components, so it is read inside Suspense
async function UsersContent({ searchParams }: Pick<PageProps<"/users">, "searchParams">) {
  const params = parseUserListParams(await searchParams);
  const { user, organization } = await getAppContext();
  const data = await listUsers(organization.id, user.id, params);

  return <UsersTableSection data={data} params={params} />;
}

// The count needs the signed-in user's organization (the session, request data). Inside its own
// Suspense, so a navigation shows the bar at once and the number streams in; cached and tagged, so
// it refreshes after user actions
async function UsersTopBarWithCount() {
  const { organization } = await getAppContext();
  return <UsersTopBar count={await countListedUsers(organization.id)} />;
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
