"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { invitationsTag } from "@/lib/invitations/tags";
import { subscriptionTag } from "@/lib/plans/tags";
import { surveysTag } from "@/lib/surveys/list";
import { deleteAccount as deleteAccountService, DeleteAccountError, type DeleteAccountErrorCode } from "@/lib/users/delete-account";
import { usersTag } from "@/lib/users/list";
import { userTag } from "@/lib/users/tags";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/server/active-organization";
import { getAccountContext } from "@/server/app-context";

// Errors are codes, never text: the client translates them

export type DeleteAccountResult = { success: false; error: { code: DeleteAccountErrorCode | "UNKNOWN" } };

// Deletes the signed-in user's account (never another id: it comes from the session), then ends
// the session and goes to sign in with a notice. Only errors come back
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const { user } = await getAccountContext();
  let deleted;
  try {
    deleted = await deleteAccountService(user.id);
  } catch (error) {
    if (error instanceof DeleteAccountError) return { success: false, error: { code: error.code } };
    console.error(error);
    return { success: false, error: { code: "UNKNOWN" } };
  }

  updateTag(userTag(user.id));
  // Member lists, pending invitations and "created by" in the organizations they were in
  for (const id of deleted.organizationIds) {
    updateTag(usersTag(id));
    updateTag(invitationsTag(id));
    updateTag(surveysTag(id));
  }
  for (const id of deleted.subscriptionIds) updateTag(subscriptionTag(id));
  for (const id of deleted.affectedUserIds) updateTag(userTag(id));
  (await cookies()).delete(ACTIVE_ORGANIZATION_COOKIE);
  await signOut({ redirectTo: `${SIGN_IN_PATH}?deleted=1` });
  // signOut redirects; this is never reached
  return { success: false, error: { code: "UNKNOWN" } };
}
