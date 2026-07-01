import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase-server'
import { getPublicUrl } from '@/lib/r2'
import { sortPhotos } from '@/lib/sort-photos'
import { apiError } from '@/lib/api-errors'

// GET /api/photos?eventId=xxx — fallback fetch if Realtime isn't connected
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')

  if (!eventId) {
    return apiError('eventId required', 400)
  }

  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', eventId)
    .eq('approved', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return apiError(error.message, 500)

  const photos = sortPhotos(data ?? []).map((row) => ({ ...row, url: getPublicUrl(row.storage_key) }))
  return NextResponse.json({ photos })
}

// PATCH /api/photos?id=xxx — toggle approved flag (admin only)
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return apiError('id required', 400)
  }

  let body: { approved?: boolean }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  if (typeof body.approved !== 'boolean') {
    return apiError('approved (boolean) required', 400)
  }

  const supabase = getServerClient()
  const { error } = await supabase
    .from('photos')
    .update({ approved: body.approved })
    .eq('id', id)

  if (error) return apiError(error.message, 500)
  return NextResponse.json({ ok: true })
}
