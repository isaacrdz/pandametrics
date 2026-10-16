import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import { SIGN_IN_PATH } from "@/lib/auth/paths";

// Optimistic check on the admin routes: a valid session cookie, or a redirect to sign in that comes
// back to the same page (callbackUrl). No database here; getAppContext checks the user. The landing,
// the kiosk (/s and its submit action) and /api/auth are never matched
const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  if (request.auth?.user) return NextResponse.next();

  const signIn = new URL(SIGN_IN_PATH, request.nextUrl.origin);
  signIn.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(signIn);
});

export const config = {
  matcher: ["/dashboard/:path*", "/surveys/:path*", "/users/:path*", "/profile"],
};
