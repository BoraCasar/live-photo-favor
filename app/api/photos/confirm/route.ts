import { NextResponse } from 'next/server'
import { getServerClient, supabaseConnectionErrorMessage } from '@/lib/supabase-server'
import { nextPhotoSortOrder } from '@/lib/next-photo-sort-order'
import { apiError } from '@/lib/api-errors'

export async function POST(request: Request) {
  let body: {
    eventId?: string
    storageKey?: string
    guestName?: string
    caption?: string
  }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const { eventId, storageKey, guestName, caption } = body
  if (!eventId || !storageKey) {
    return apiError('Parâmetros obrigatórios ausentes', 400)
  }

  const keyPattern = new RegExp(`^events/${eventId}/[a-zA-Z0-9._-]+$`)
  if (!keyPattern.test(storageKey)) {
    return apiError('Chave de armazenamento inválida', 400)
  }

  try {
    const supabase = getServerClient()
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('is_active', true)
      .single()

    if (eventError || !event) {
      return apiError('Evento não encontrado', 404)
    }

    const sortOrder = await nextPhotoSortOrder(supabase, eventId)

    const { error: dbError } = await supabase.from('photos').insert({
      event_id: eventId,
      storage_key: storageKey,
      guest_name: guestName?.trim() || null,
      caption: caption?.trim() || null,
      approved: true,
      sort_order: sortOrder,
    })

    if (dbError) {
      return apiError(dbError.message, 500)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('Photo confirm failed:', err)
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}
