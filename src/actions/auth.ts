"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { SIGN_IN_PATH, safeCallbackUrl } from "@/lib/auth/paths";
import { signInSchema } from "@/lib/auth/schema";

// Error codes, never text: the client translates them (auth.errors)
export type SignInErrorCode = "CredentialsSignin" | "default";

// Email and password. On success Auth.js sets the session cookie and redirects (a thrown redirect,
// so it is rethrown); a failed check comes back as an AuthError. Every failure is the same
// "wrong email or password", so the answer never tells which emails exist
export async function signInWithPassword(
  values: { email: string; password: string },
  callbackUrl: string,
): Promise<{ error: SignInErrorCode }> {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return { error: "CredentialsSignin" };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeCallbackUrl(callbackUrl) });
  } catch (error) {
    if (error instanceof AuthError) return { error: error.type === "CredentialsSignin" ? "CredentialsSignin" : "default" };
    throw error;
  }
  return { error: "default" };
}

// Starts the Google flow (a redirect to Google). Errors come back to /sign-in?error=…
export async function signInWithGoogle(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
}

// Ends the session (clears the cookie) and goes to sign in. Used by the sidebar user menu and the
// profile
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
