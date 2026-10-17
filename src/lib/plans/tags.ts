// Tag of every cached read of a subscription (the plan owner's and each Business member's): a
// renewal, expiry by script or plan change expires it, so the whole plan updates at once
export function subscriptionTag(subscriptionId: string): string {
  return `subscription:${subscriptionId}`;
}
