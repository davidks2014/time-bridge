// src/lib/auth.ts

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // ❌ REMOVE PrismaAdapter (we use JWT only)

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // ✅ 7 days session
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        // ✅ Fetch everything ONCE
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            verificationStatus: true,
          },
        });

        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // ✅ Return everything needed (no future DB calls needed)
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          verificationStatus: user.verificationStatus,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // ✅ Only set once at login
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.verificationStatus = (user as any).verificationStatus;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).verificationStatus = token.verificationStatus;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};