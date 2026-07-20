// lib/auth.ts
import bcrypt from 'bcryptjs'

export async function verifyPassword(input: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(input, hash)
}

// Confronto constant-time in JS puro (verifyAuthToken gira su Edge runtime nel
// proxy/middleware, dove node:crypto non è disponibile). Evita timing attack sul
// token statico: itera sempre su tutta la lunghezza, senza early-return sul primo
// byte diverso.
export function verifyAuthToken(token: string | undefined): boolean {
  const secret = process.env.AUTH_SECRET
  if (!token || !secret || token.length !== secret.length) return false
  let mismatch = 0
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  return mismatch === 0
}
