"use server";

import { signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/lib/auth/paths";

// Ends the session (clears the cookie) and goes to sign in. Used by the sidebar user menu and the
// profile; a plain form action, so it also works before hydration
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
