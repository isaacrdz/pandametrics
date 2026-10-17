import { getSessionAppContext } from "@/server/app-context";
import { getDashboardVersion } from "@/server/dashboard-version";
import { createRateLimiter } from "@/server/rate-limit";

// Polled by the open dashboard (every few seconds while visible) to learn whether new answers or
// survey changes arrived; the page then refreshes its cards in place. A GET route rather than a
// Server Action: actions run one at a time per client and polling would delay the user's own clicks

// One tab polls 12 times a minute; this leaves room for about ten open tabs
const versionLimiter = createRateLimiter("dashboard-version", { windowMs: 60_000, max: 120 });

function failure(status: number, code: "SIGNED_OUT" | "NO_ORGANIZATION" | "RATE_LIMITED"): Response {
  return Response.json({ success: false, error: { code } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(): Promise<Response> {
  const session = await getSessionAppContext();
  if (session.status === "signed-out") return failure(401, "SIGNED_OUT");
  if (session.status === "no-organization") return failure(409, "NO_ORGANIZATION");

  const { user, organization } = session.context;
  if (!versionLimiter.take([user.id])) return failure(429, "RATE_LIMITED");

  const version = await getDashboardVersion(organization.id);
  return Response.json({ success: true, data: { version } }, { headers: { "Cache-Control": "no-store" } });
}
