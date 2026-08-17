// middleware.ts (root of project, next to package.json)
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/auth'

// /urbistat: brand assets (logo, hero image) for the login screen — must stay
// reachable before auth, otherwise the login page itself renders with broken images.
const PUBLIC_PATHS = ['/login', '/api/auth', '/api/webhook', '/api/cron', '/urbistat']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value
  if (!verifyAuthToken(token)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
