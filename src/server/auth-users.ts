import "server-only";

import { prisma } from "@/server/prisma";

// The database side of sign-in (src/auth.ts): who may sign in, creating a user with their own
// organization (open sign-up) and what changes when a Google account is linked. Kept apart from the
// Auth.js wiring so the rules can be checked directly (docs/auth.md, section 4).

export interface NewUserData {
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
}

// "Miguel Rayon" → organization "Miguel Rayon"; renaming comes with the organization settings
function organizationNameFor(user: NewUserData): string {
  return user.name?.trim() || user.email.split("@")[0];
}

// Never a user without an organization: both in one transaction, the user as its OWNER. Only for
// emails a provider verified (Google, checked in the signIn callback)
export async function createUserWithOrganization(data: NewUserData) {
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: { name: organizationNameFor(data) } });
    return tx.user.create({
      data: {
        name: data.name ?? null,
        email: data.email,
        emailVerified: data.emailVerified ?? new Date(),
        image: data.image ?? null,
        role: "OWNER",
        isActive: true,
        organizationId: organization.id,
      },
    });
  });
}

// The user a sign-in would land on: by the linked account first (the email may have changed
// since), then by email (first sign-in with this provider). New emails may sign up (open sign-up);
// existing users only while active and not deleted
export async function canSignIn(provider: string, providerAccountId: string, email: string): Promise<boolean> {
  const select = { isActive: true, deletedAt: true } as const;
  const account = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { user: { select } },
  });
  const user = account?.user ?? (await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select }));
  return !user || (user.isActive && user.deletedAt === null);
}

// First Google sign-in of an existing user. A self-registered (unverified) email may have been
// claimed by someone else with a password: the verified Google owner takes over and that password
// stops working. The Google photo fills an empty avatar, never replaces one
export async function onGoogleAccountLinked(userId: string, image: string | null | undefined): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, emailVerified: null },
    data: { emailVerified: new Date(), passwordHash: null },
  });
  if (image) await prisma.user.updateMany({ where: { id: userId, image: null }, data: { image } });
}
