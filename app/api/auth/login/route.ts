// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// Max 5 tentativi ogni 15 minuti per IP.
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const { allowed, retryAfter } = rateLimit(`login:${clientIp(request)}`, MAX_ATTEMPTS, WINDOW_MS)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Troppi tentativi. Riprova più tardi.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const { password } = await request.json()

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const valid = await verifyPassword(password)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('auth_token', process.env.AUTH_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
