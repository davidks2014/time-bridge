import { Capacitor } from '@capacitor/core';

export async function nativeGoogleSignIn() {
  if (!Capacitor.isNativePlatform()) return null;

  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

  // @ts-ignore — serverClientId not in InitOptions types but supported at runtime
  await GoogleAuth.initialize({
    scopes: ['profile', 'email'],
    serverClientId: '988942190998-9siaq5bkbbs7tl2omjvsmvuu8cpfcfc3.apps.googleusercontent.com',
    grantOfflineAccess: true,
  });

  const googleUser = await GoogleAuth.signIn();
  return googleUser;
}
