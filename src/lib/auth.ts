// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");

        // Basic validation
        if (!email || !password) return null;

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true },
        });

        if (!user?.passwordHash) return null;

        // Check password
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Return minimal user object for token
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On login, attach user id into token
      if (user) token.id = (user as any).id;

      // Load role + verificationStatus from DB
      if (token?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { role: true, verificationStatus: true },
        });

        (token as any).role = dbUser?.role ?? "USER";
        (token as any).verificationStatus = dbUser?.verificationStatus ?? "PENDING";
      } else {
        (token as any).role = "USER";
        (token as any).verificationStatus = "PENDING";
      }

      return token;
    },

    async session({ session, token }) {
      // Expose id/role/verificationStatus to client session
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role;
        (session.user as any).verificationStatus = (token as any).verificationStatus;
      }
      return session;
    },
  },

  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};