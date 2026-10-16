import { getAppContext } from "@/server/app-context";

// For organization pages whose content needs no data (/surveys/new): checks the session in a
// Suspense boundary and redirects to sign in, or to /welcome without an organization
export async function RequireOrganization() {
  await getAppContext();
  return null;
}
