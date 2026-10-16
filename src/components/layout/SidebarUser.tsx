import { NavUser } from "@/components/layout/NavUser";
import { getAppContext } from "@/server/app-context";

// The signed-in user in the sidebar footer. Reads the session, so the layout renders it inside
// Suspense (NavUserSkeleton)
export async function SidebarUser() {
  const { user } = await getAppContext();
  return <NavUser name={user.name} email={user.email} image={user.image} />;
}
