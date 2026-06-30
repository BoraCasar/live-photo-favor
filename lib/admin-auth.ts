import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { getServerClient } from '@/lib/supabase-server'
import type { Admin } from '@/types'

const COOKIE_NAME = 'admin_session'
const SESSION_MS = 7 * 24 * 60 * 60 * 1000

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured in .env.local')
  }
  return secret
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, 64)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

export function createSessionToken(adminId: string): string {
  const payload = JSON.stringify({ adminId, exp: Date.now() + SESSION_MS })
  const data = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', getSessionSecret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function parseSessionToken(token: string): { adminId: string } | null {
  const [data, sig] = token.split('.')
  if (!data || !sig) return null

  const expected = createHmac('sha256', getSessionSecret()).update(data).digest('base64url')
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as {
      adminId?: string
      exp?: number
    }
    if (!payload.adminId || !payload.exp || payload.exp < Date.now()) return null
    return { adminId: payload.adminId }
  } catch {
    return null
  }
}

export async function getAdminFromSession(): Promise<Admin | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = parseSessionToken(token)
  if (!session) return null

  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('admins')
    .select('id, email, company_name, created_at, subscription_status, subscription_expires_at')
    .eq('id', session.adminId)
    .single()

  if (error || !data) return null
  return {
    ...data,
    subscription_status: (data.subscription_status ?? 'inactive') as Admin['subscription_status'],
  } as Admin
}

export function sessionCookieOptions(token: string) {
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

export function clearSessionCookieOptions() {
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
