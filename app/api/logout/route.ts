import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logout successful' },
    { status: 200 }
  );

  // Clear session cookie
  response.cookies.delete('admin-session');

  return response;
}
