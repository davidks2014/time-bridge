import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encode } from 'next-auth/jwt';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    let dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        verificationStatus: true,
        identificationNo: true,
        phoneNumber: true,
        address: true,
      },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name ?? normalizedEmail.split('@')[0],
          passwordHash: '',
          phoneNumber: '',
          identificationNo: '',
          address: '',
          verificationStatus: 'APPROVED',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          verificationStatus: true,
          identificationNo: true,
          phoneNumber: true,
          address: true,
        },
      });
    }

    const profileComplete = !!(
      dbUser.identificationNo &&
      dbUser.phoneNumber &&
      dbUser.address
    );

    // Mint a NextAuth-compatible JWT so the session works transparently
    const token = await encode({
      token: {
        email: dbUser.email,
        name: dbUser.name,
        userId: dbUser.id,
        role: dbUser.role,
        verificationStatus: dbUser.verificationStatus,
        profileComplete,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error('[native-google] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
