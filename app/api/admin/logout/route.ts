import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearSessionCookieOptions } from '@/lib/admin-auth'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(clearSessionCookieOptions())
  return NextResponse.json({ ok: true })
}
