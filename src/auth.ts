import "server-only";

import NextAuth from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { revalidateTag } from "next/cache";
import authConfig from "@/auth.config";
import { userTag } from "@/lib/users/tags";
import { canSignIn, createUserWithOrganization, onGoogleAccountLinked } from "@/server/auth-users";
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
