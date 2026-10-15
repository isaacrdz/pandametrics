import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersTableSection } from "@/components/users/table/UsersTableSection";
import { UsersTableSkeleton } from "@/components/users/table/UsersTableSkeleton";
import { UsersTopBar } from "@/components/users/table/UsersTopBar";
import { getAppContext } from "@/lib/dashboard";
import { listUsers } from "@/lib/users/list";
import { parseUserListParams } from "@/lib/users/list-params";
import { listUsers as listStoredUsers } from "@/lib/users/service";

export const metadata: Metadata = {
  title: "Users · Panda Metrics",
};

// searchParams is runtime data under Cache Components, so it is read inside Suspense
async function UsersContent({ searchParams }: Pick<PageProps<"/users">, "searchParams">) {
  const params = parseUserListParams(await searchParams);
  const { user, organization } = getAppContext();
  const data = listUsers(organization.id, user.id, params);

  return <UsersTableSection data={data} params={params} />;
}

export default function UsersPage({ searchParams }: PageProps<"/users">) {
  // The total does not depend on the URL, so the bar (title + count) is part of the static shell
  const { organization } = getAppContext();
  const total = listStoredUsers(organization.id).length;

  return (
    <>
      <UsersTopBar count={total} />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Suspense fallback={<UsersTableSkeleton />}>
          <UsersContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
