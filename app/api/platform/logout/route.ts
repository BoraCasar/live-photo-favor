import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearPlatformSessionCookieOptions } from '@/lib/platform-auth'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(clearPlatformSessionCookieOptions())
  return NextResponse.json({ ok: true })
}
