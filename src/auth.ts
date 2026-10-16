import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { revalidateTag } from "next/cache";
import authConfig, { CREDENTIAL_FIELDS } from "@/auth.config";
import { signInSchema } from "@/lib/auth/schema";
import { userTag } from "@/lib/users/tags";
import { canSignIn, createUserWithOrganization, onGoogleAccountLinked, verifyCredentials } from "@/server/auth-users";
import { clientIpFrom } from "@/server/client-ip";
import { createRateLimiter } from "@/server/rate-limit";
import { prisma } from "@/server/prisma";

// The app's Auth.js instance: shared options (auth.config.ts) plus the database. Sign-up is open:
// a new Google account becomes the OWNER of its own organization (rules in src/server/auth-users.ts)

// The adapter's types expect @prisma/client; the app's client is generated in src/generated/prisma
const prismaAdapter = PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]);

const adapter: Adapter = {
  ...prismaAdapter,
  async createUser(user) {
    return (await createUserWithOrganization(user)) as AdapterUser;
  },
};

// Failed email / password attempts per IP + email: 10 per 15 minutes. Past it every attempt fails
// like a wrong password until the window frees up
const signInLimiter = createRateLimiter("sign-in", { windowMs: 15 * 60_000, max: 10 });

const credentials = Credentials({
  credentials: CREDENTIAL_FIELDS,
  async authorize(raw, request) {
    const parsed = signInSchema.safeParse(raw);
    if (!parsed.success) return null;

    const { email, password } = parsed.data;
    const keys = [`${clientIpFrom(request.headers) ?? "unknown"}:${email}`];
    if (signInLimiter.isLimited(keys)) return null;

    const user = await verifyCredentials(email, password);
    if (!user) signInLimiter.record(keys);
    return user;
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // The real Credentials provider instead of the placeholder from auth.config.ts
  providers: authConfig.providers.map((provider) => ("id" in provider && provider.id === "credentials" ? credentials : provider)),
  adapter,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      // Linking by email is only safe when Google vouches for the address
      if (profile?.email_verified !== true || !profile.email) return false;
      return canSignIn(account.provider, account.providerAccountId, profile.email);
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      if (!user.id || account.provider !== "google") return;
      await onGoogleAccountLinked(user.id, profile.image);
      revalidateTag(userTag(user.id), { expire: 0 });
    },
  },
});
