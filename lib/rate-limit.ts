// Rate limiter in-memory, fixed-window per chiave (es. IP).
// Nota: su serverless la memoria è per-istanza, quindi il conteggio è approssimato
// (un attaccante distribuito su più istanze aggira il limite). Sufficiente per
// rallentare il brute-force sul login single-admin; per garanzie forti serve
// uno store condiviso (Upstash/Redis).
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = { allowed: boolean; retryAfter: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  bucket.count++
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfter: 0 }
}

// Estrae l'IP client dagli header proxy (Vercel/Next).
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
