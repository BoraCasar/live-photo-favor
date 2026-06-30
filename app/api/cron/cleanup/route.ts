import { NextResponse } from 'next/server'
import { cleanupExpiredEvents } from '@/lib/cleanup-expired'
import { apiError } from '@/lib/api-errors'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return apiError('CRON_SECRET não configurado', 500)
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return apiError('Unauthorized', 401)
  }

  try {
    const result = await cleanupExpiredEvents()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Cleanup failed:', err)
    return apiError(err instanceof Error ? err.message : 'Cleanup failed', 500)
  }
}
