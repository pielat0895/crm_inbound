// lib/auth.ts
import bcrypt from 'bcryptjs'

export async function verifyPassword(input: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(input, hash)
}

export function verifyAuthToken(token: string | undefined): boolean {
  if (!token) return false
  return token === process.env.AUTH_SECRET
}
