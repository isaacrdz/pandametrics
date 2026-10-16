import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Auth.js options shared by the app (src/auth.ts) and the proxy (src/proxy.ts). No Prisma or
// other server-only imports: the proxy runs on every request and only reads the session cookie.

// The email / password fields (the default sign-in page renders them)
export const CREDENTIAL_FIELDS = {
  email: { label: "Email", type: "email" },
  password: { label: "Password", type: "password" },
};

export default {
  providers: [
    Google({
      // Users exist before their first Google sign-in (seed, registration): a verified Google
      // account with the same email links to them instead of failing with OAuthAccountNotLinked.
      // Safe only with the email_verified check in src/auth.ts
      allowDangerousEmailAccountLinking: true,
      // Stored emails are lowercase, so the lookup by email matches whatever casing Google sends
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email?.toLowerCase(),
          image: profile.picture,
        };
      },
    }),
    // Placeholder: src/auth.ts replaces it with the real check against the database
    Credentials({ credentials: CREDENTIAL_FIELDS, authorize: () => null }),
  ],
  // Credentials (phase 2) needs JWT sessions; the token only carries the user id, and the user
  // and organization are always read from the database (src/server/app-context.ts)
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      return session;
    },
  },
} satisfies NextAuthConfig;
