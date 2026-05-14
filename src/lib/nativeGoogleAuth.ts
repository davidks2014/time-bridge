import { Capacitor } from '@capacitor/core';

export async function nativeGoogleSignIn() {
  if (!Capacitor.isNativePlatform()) return null;

  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

  await GoogleAuth.initialize({
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  } as any);

  const googleUser = await GoogleAuth.signIn();
  return googleUser;
}
