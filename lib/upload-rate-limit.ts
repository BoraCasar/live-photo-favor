const uploadCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

export function getUploadClientId(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown'
}

export function checkUploadRateLimit(clientId: string): boolean {
  const now = Date.now()
  const entry = uploadCounts.get(clientId)
  if (!entry || entry.resetAt < now) {
    uploadCounts.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}
