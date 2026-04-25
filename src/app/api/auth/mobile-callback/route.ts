import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  // Redirect back into the native app via custom URL scheme
  return NextResponse.redirect(
    `sgtimebridge://login?next=${encodeURIComponent(callbackUrl)}`
  );
}
