// Tag of one user's cached app context (src/server/app-context.ts): expired when their record
// changes (profile edits, activate, deactivate, delete, a linked Google account), so a deactivated
// user is signed out on their next request
export function userTag(userId: string): string {
  return `user:${userId}`;
}
