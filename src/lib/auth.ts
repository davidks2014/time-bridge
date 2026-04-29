// src/lib/auth.ts

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // ❌ REMOVE PrismaAdapter (we use JWT only)

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // ✅ 7 days session
  },

  providers: [
    // Google OAuth provider
    // Allows users to sign in with their Google account
    // New Google users will be prompted to complete their profile after first login
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

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
    async signIn({ user, account }) {
      if (account?.provider === "credentials") {
        return true;
      }

      if (account?.provider === "google") {
        try {
          const email = user.email?.toLowerCase().trim();
          if (!email) return false;

          const existing = await prisma.user.findUnique({
            where: { email },
            select: { id: true, verificationStatus: true },
          });

          if (existing) {
            return true;
          }

          await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              passwordHash: "",
              phoneNumber: "",
              identificationNo: "",
              address: "",
              verificationStatus: "PENDING",
            },
          });

          return true;
        } catch (err) {
          console.error("[auth] Google signIn error:", err);
          return false;
        }
      }

      return false;
    },

    async session({ session, token: _token }) {
      if (session.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email.toLowerCase() },
          select: {
            id: true,
            role: true,
            verificationStatus: true,
            rejectReason: true,
            proofOfLifeStage: true,
            name: true,
            identificationNo: true,
            phoneNumber: true,
            address: true,
          },
        });

        if (user) {
          (session.user as any).id = user.id;
          (session.user as any).role = user.role;
          (session.user as any).verificationStatus = user.verificationStatus;
          (session.user as any).rejectReason = user.rejectReason ?? null;
          (session.user as any).proofOfLifeStage = user.proofOfLifeStage;
          (session.user as any).profileComplete = !!(
            user.identificationNo &&
            user.phoneNumber &&
            user.address
          );
        }
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Honor explicit in-app paths (e.g. callbackUrl=/complete-profile)
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Honor same-origin and production domain URLs
      if (url.startsWith(baseUrl)) return url;
      if (url.includes('timebridge.sg')) return url;
      // Default — middleware will enforce correct routing per verification status
      return `${baseUrl}/dashboard`;
    },

    async jwt({ token, user }) {
      // On first login, seed the token from the provider user object
      if (user) {
        token.email = user.email;
        token.role = (user as any).role;
        token.verificationStatus = (user as any).verificationStatus;
      }

      // On every request re-fetch from DB so admin changes are reflected immediately
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: String(token.email).toLowerCase() },
            select: {
              id: true,
              name: true,
              role: true,
              verificationStatus: true,
              rejectReason: true,
              proofOfLifeStage: true,
              identificationNo: true,
              phoneNumber: true,
              address: true,
            },
          });

          if (dbUser) {
            token.userId = dbUser.id;
            token.userName = dbUser.name;
            token.role = dbUser.role;
            token.verificationStatus = dbUser.verificationStatus;
            token.rejectReason = dbUser.rejectReason ?? null;
            token.proofOfLifeStage = dbUser.proofOfLifeStage;
            token.profileComplete = !!(
              dbUser.identificationNo &&
              dbUser.phoneNumber &&
              dbUser.address
            );
          }
        } catch (e) {
          console.error("JWT refresh error:", e);
        }
      }

      return token;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};