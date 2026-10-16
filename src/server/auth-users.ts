import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { RegisterValues } from "@/lib/auth/schema";
import { hashPassword, verifyPassword } from "@/lib/users/password";
import { prisma } from "@/server/prisma";

// The database side of sign-in (src/auth.ts) and registration: who may sign in, checking a password,
// creating a new account (open sign-up, with no organization: the user creates theirs on /welcome)
// and what changes when a Google account is linked. Kept apart from the Auth.js wiring so the rules can be checked directly
// (docs/auth.md, section 4).

export interface NewUserData {
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
}

// A new Google account: the account only, with no organization (the user creates theirs or joins one
// through an invite). Only for emails a provider verified (Google, checked in the signIn callback)
export async function createProviderUser(data: NewUserData) {
  return prisma.user.create({
    data: {
      name: data.name ?? null,
      email: data.email,
      emailVerified: data.emailVerified ?? new Date(),
      image: data.image ?? null,
      isActive: true,
    },
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
// stops working
export async function onGoogleAccountLinked(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, emailVerified: null },
    data: { emailVerified: new Date(), passwordHash: null },
  });
}

// Google profile photos are served from googleusercontent.com
const GOOGLE_PHOTO_HOST = "googleusercontent.com/";

// Every Google sign-in: the profile picture follows the Google photo, so a new photo there shows up
// here on the next sign-in. Only an empty avatar or an earlier Google photo is replaced; a photo
// uploaded in the app (later) is never overwritten. Returns whether the user changed
export async function syncGooglePhoto(userId: string, picture: string | null | undefined): Promise<boolean> {
  if (!picture?.startsWith("https://")) return false;
  const { count } = await prisma.user.updateMany({
    where: {
      id: userId,
      // "Not the same photo" only on the Google branch: NOT (image = …) is NULL for an empty image
      OR: [{ image: null }, { image: { contains: GOOGLE_PHOTO_HOST, not: picture } }],
    },
    data: { image: picture },
  });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Email and password
// ---------------------------------------------------------------------------

export interface SignedInUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

// A valid scrypt hash of a random password nobody knows, only to spend the same time. Made on first
// use, not when the module loads (pages that import this module are prerendered)
let dummyHash: string | undefined;
function getDummyHash(): string {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
}

// null for every failure alike (unknown email, wrong password, Google-only account, inactive or
// deleted user), so the answer never tells which emails exist. An account without an organization
// signs in and lands on /welcome
export async function verifyCredentials(email: string, password: string): Promise<SignedInUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      isActive: true,
      deletedAt: true,
    },
  });
  // Hash anyway when there is no user, so a missing email takes as long as a wrong password
  const valid = verifyPassword(password, user?.passwordHash ?? getDummyHash());
  if (!user || !valid || !user.passwordHash || !user.isActive || user.deletedAt) return null;
  return { id: user.id, name: user.name, email: user.email, image: user.image };
}

export class EmailTakenError extends Error {
  constructor() {
    super("EMAIL_TAKEN");
  }
}

// Open registration: the account only, with no organization (created on /welcome). The email stays
// unverified (emailVerified null) until its owner signs in with Google, which then takes the account over
export async function registerUser(input: RegisterValues): Promise<{ id: string }> {
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: hashPassword(input.password),
        emailVerified: null,
        isActive: true,
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new EmailTakenError();
    throw error;
  }
}
