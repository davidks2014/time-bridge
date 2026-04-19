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
      // Allow credentials login to pass through to the existing logic
      if (account?.provider === "credentials") {
        return true;
      }

      // Handle Google login
      if (account?.provider === "google") {
        try {
          const email = user.email?.toLowerCase().trim();
          if (!email) return false;

          // Check if user already exists in database
          const existing = await prisma.user.findUnique({
            where: { email },
            select: { id: true, verificationStatus: true },
          });

          if (existing) {
            // Existing user — allow sign in
            // They have already been verified previously
            return true;
          }

          // New Google user — create a basic account
          // They will be prompted to complete their profile
          // (NRIC, address, trusted contact) after first login
          await prisma.user.create({
            data: {
              email,
              // Use Google display name or fallback to email prefix
              name: user.name ?? email.split("@")[0],
              // Google users do not have a password — set empty string
              // They always log in via Google OAuth
              passwordHash: "",
              // These will be completed in profile setup after first login
              phoneNumber: "",
              identificationNo: "",
              address: "",
              // Google users still need admin verification
              // unless we later add Singpass which auto-verifies
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

    async session({ session, token }) {
      // Add user role and verification status to the session
      // so the frontend can use it for routing decisions
      if (session.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email.toLowerCase() },
          select: {
            id: true,
            role: true,
            verificationStatus: true,
            name: true,
            // Check if profile is complete — Google users may not have filled this yet
            identificationNo: true,
            phoneNumber: true,
            address: true,
          },
        });

        if (user) {
          (session.user as any).id = user.id;
          (session.user as any).role = user.role;
          (session.user as any).verificationStatus = user.verificationStatus;
          // Flag incomplete profile so frontend can redirect to profile setup
          (session.user as any).profileComplete = !!(
            user.identificationNo &&
            user.phoneNumber &&
            user.address
          );
        }
      }

      return session;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};