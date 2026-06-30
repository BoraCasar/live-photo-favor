import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { hashPassword, verifyPassword } from '@/lib/admin-auth'
import { getServerClient } from '@/lib/supabase-server'
import type { PlatformAdmin } from '@/types'

const COOKIE_NAME = 'platform_session'
const SESSION_MS = 7 * 24 * 60 * 60 * 1000

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured in .env.local')
  }
  return secret
}

export function createPlatformSessionToken(platformAdminId: string): string {
  const payload = JSON.stringify({ platformAdminId, exp: Date.now() + SESSION_MS })
  const data = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', getSessionSecret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function parsePlatformSessionToken(token: string): { platformAdminId: string } | null {
  const [data, sig] = token.split('.')
  if (!data || !sig) return null

  const expected = createHmac('sha256', getSessionSecret()).update(data).digest('base64url')
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as {
      platformAdminId?: string
      exp?: number
    }
    if (!payload.platformAdminId || !payload.exp || payload.exp < Date.now()) return null
    return { platformAdminId: payload.platformAdminId }
  } catch {
    return null
  }
}

export async function getPlatformAdminFromSession(): Promise<PlatformAdmin | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = parsePlatformSessionToken(token)
  if (!session) return null

  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('platform_admins')
    .select('id, email, created_at')
    .eq('id', session.platformAdminId)
    .single()

  if (error || !data) return null
  return data as PlatformAdmin
}

export function platformSessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MS / 1000,
  }
}

export function clearPlatformSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}

export { hashPassword, verifyPassword }
