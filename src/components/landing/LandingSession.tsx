import { LandingSessionSignal } from "@/components/landing/landing-session";
import { getSessionAccount } from "@/server/app-context";

// Request data, rendered inside Suspense by the marketing layout: the rest of the landing stays
// prerendered. A session of a deactivated or deleted account counts as signed out (as on /sign-in)
export async function LandingSession() {
  const account = await getSessionAccount();
  return <LandingSessionSignal signedIn={account !== null} />;
}
