import { registerSchema } from "@/lib/auth/schema";
import { EmailTakenError, registerOwner } from "@/server/auth-users";
import { clientIpFrom } from "@/server/client-ip";
import { createRateLimiter } from "@/server/rate-limit";

// Open registration: a new organization and its OWNER (docs/auth.md, section 4.2). Public, like the
// rest of /api/v1 it answers { success, data } or { success: false, error: { code } }; the client
// translates the codes

type ErrorCode = "VALIDATION" | "EMAIL_TAKEN" | "RATE_LIMITED" | "UNKNOWN";

interface FieldError {
  path: string;
  message: string;
}

// Accounts per IP: 5 per hour
const registerLimiter = createRateLimiter("register", { windowMs: 60 * 60_000, max: 5 });

function failure(status: number, code: ErrorCode, fieldErrors?: FieldError[]): Response {
  return Response.json({ success: false, error: fieldErrors ? { code, fieldErrors } : { code } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure(400, "VALIDATION");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    return failure(400, "VALIDATION", fieldErrors);
  }

  // Only valid attempts count, so a typo does not use up the allowance
  const ip = clientIpFrom(request.headers) ?? "unknown";
  if (!registerLimiter.take([ip])) return failure(429, "RATE_LIMITED");

  try {
    const user = await registerOwner(parsed.data);
    return Response.json({ success: true, data: { id: user.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailTakenError) return failure(409, "EMAIL_TAKEN");
    console.error(error);
    return failure(500, "UNKNOWN");
  }
}
