import { Capacitor } from '@capacitor/core';

export async function nativeGoogleSignIn() {
  if (!Capacitor.isNativePlatform()) return null;
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
  await GoogleAuth.initialize({
    clientId: '988942190998-9siaq5bkbbs7tl2omjvsmvuu8cpfcfc3.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
  const googleUser = await GoogleAuth.signIn();
  return googleUser;
}
