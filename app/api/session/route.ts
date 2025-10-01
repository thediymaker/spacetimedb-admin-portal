import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('admin-session');

  if (!sessionCookie) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString()
    );

    // Check if session is still valid (7 days)
    const maxAge = 60 * 60 * 24 * 7 * 1000; // 7 days in ms
    if (Date.now() - sessionData.timestamp > maxAge) {
      return NextResponse.json(
        { authenticated: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { authenticated: true, username: sessionData.username },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: 'Invalid session' },
      { status: 401 }
    );
  }
}
