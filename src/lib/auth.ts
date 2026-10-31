import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, verifyPassword } from "@/lib/password";

const providers: NextAuthOptions["providers"] = [
  // Email + password. Accounts are created by POST /api/register.
  CredentialsProvider({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const user = await prisma.user.findUnique({ where: { email: normalizeEmail(credentials.email) } });
      if (!user?.passwordHash) return null;
      if (!(await verifyPassword(credentials.password, user.passwordHash))) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    })
  );
}

/** Which sign-in options the login page should offer. */
export const enabledProviders = {
  email: providers.some((p) => p.id === "email"),
};

export const authOptions: NextAuthOptions = {
  // The adapter stores users and email-link tokens.
  adapter: PrismaAdapter(prisma),
  providers,
  // Password sign-in only works with JWT sessions in NextAuth v4.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};
