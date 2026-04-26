import { Capacitor } from '@capacitor/core';

export async function nativeGoogleSignIn() {
  if (!Capacitor.isNativePlatform()) return null;
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
  await GoogleAuth.initialize({
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
  const googleUser = await GoogleAuth.signIn();
  return googleUser;
}
