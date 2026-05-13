import { Capacitor } from '@capacitor/core';

export async function nativeGoogleSignIn() {
  if (!Capacitor.isNativePlatform()) return null;
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
  await GoogleAuth.initialize({
    clientId: '988942190998-kbrcgan2asv60vcu5oillabh5nfsp1lf.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
  const googleUser = await GoogleAuth.signIn();
  return googleUser;
}
