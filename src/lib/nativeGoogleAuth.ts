import { Capacitor } from '@capacitor/core';

// Native Google Sign-In for Android using Capacitor Google Auth plugin
// On Android: reads client config from google-services.json automatically
// serverClientId must be the WEB client ID (not Android client ID)
export async function nativeGoogleSignIn() {
  if (!Capacitor.isNativePlatform()) return null;

  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

  await GoogleAuth.initialize({
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });

  const googleUser = await GoogleAuth.signIn();
  return googleUser;
}
