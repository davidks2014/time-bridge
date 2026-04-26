import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get('callbackUrl') ?? '/dashboard';
  const destination = next.startsWith('/') ? next : '/dashboard';
  // Redirect to HTTPS path — Capacitor WebView handles navigation internally.
  // Using sgtimebridge:// here would fire in Chrome (external browser) and fail.
  return NextResponse.redirect(`https://timebridge.sg${destination}`);
}
