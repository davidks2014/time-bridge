export async function initCapacitor(): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
    import('@capacitor/app'),
  ]);

  await SplashScreen.hide({ fadeOutDuration: 500 });

  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setBackgroundColor({ color: '#FAF7F2' });

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  App.addListener('appUrlOpen', (event: any) => {
    const url = event.url as string;
    if (url.includes('sgtimebridge://login')) {
      const params = new URL(url.replace('sgtimebridge://', 'https://placeholder/')).searchParams;
      const next = params.get('next') ?? '/dashboard';
      window.location.href = next.startsWith('/') ? next : '/dashboard';
    }
  });
}
