// Tag of an organization's cached pending invitations (/users): every invite, revoke and answer
// expires it. The invitee's side is cached with their user tag
export function invitationsTag(organizationId: string): string {
  return `org:${organizationId}:invitations`;
}
