import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sg.timebridge.app',
  appName: 'Time Bridge',
  webDir: 'public',
  server: {
    url: 'https://time-bridge-git-develop-davidks2014s-projects.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#FAF7F2',
      spinnerColor: '#B8965A',
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'large',
      showSpinner: true,
      launchAutoHide: true,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FAF7F2',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    scheme: 'Time Bridge',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FAF7F2',
  },
};

export default config;
