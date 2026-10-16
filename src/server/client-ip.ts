import "server-only";

// First address of x-forwarded-for (the client as seen by the proxy), then x-real-ip. Only for rate
// limits: the header can be forged when no trusted proxy sets it
export function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}
