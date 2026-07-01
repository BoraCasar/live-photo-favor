import { NextResponse } from 'next/server'
import { getAdminFromSession } from '@/lib/admin-auth'
import { isSubscriptionActive, subscriptionInactiveMessage } from '@/lib/admin-subscription'
import { getOwnedEventId, getOwnedPhoto } from '@/lib/admin-event-access'
import { getServerClient, supabaseConnectionErrorMessage } from '@/lib/supabase-server'
import { apiError } from '@/lib/api-errors'
import { getPublicUrl, deleteObject } from '@/lib/r2'
import { sortPhotos } from '@/lib/sort-photos'

async function requireSubscribedAdmin() {
  const admin = await getAdminFromSession()
  if (!admin) return { error: apiError('Unauthorized', 401) as ReturnType<typeof apiError> }
  if (!isSubscriptionActive(admin)) {
    return { error: apiError(subscriptionInactiveMessage(), 402) as ReturnType<typeof apiError> }
  }
  return { admin }
}

export async function GET(request: Request) {
  const auth = await requireSubscribedAdmin()
  if ('error' in auth && auth.error) return auth.error
  const admin = auth.admin!

  const eventId = new URL(request.url).searchParams.get('eventId')
  if (!eventId) return apiError('eventId required', 400)

  if (!(await getOwnedEventId(eventId, admin.id))) {
    return apiError('Evento não encontrado', 404)
  }

  try {
    const supabase = getServerClient()
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) return apiError(error.message, 500)

    const photos = sortPhotos(data ?? []).map((row) => ({
      ...row,
      url: getPublicUrl(row.storage_key),
    }))

    return NextResponse.json({ photos })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSubscribedAdmin()
  if ('error' in auth && auth.error) return auth.error
  const admin = auth.admin!

  const photoId = new URL(request.url).searchParams.get('id')
  if (!photoId) return apiError('id required', 400)

  const photo = await getOwnedPhoto(photoId, admin.id)
  if (!photo) return apiError('Foto não encontrada', 404)

  try {
    await deleteObject(photo.storage_key)
    const supabase = getServerClient()
    const { error } = await supabase.from('photos').delete().eq('id', photoId)
    if (error) return apiError(error.message, 500)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSubscribedAdmin()
  if ('error' in auth && auth.error) return auth.error
  const admin = auth.admin!

  let body: { eventId?: string; orderedIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const { eventId, orderedIds } = body
  if (!eventId || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    return apiError('eventId and orderedIds are required', 400)
  }

  if (!(await getOwnedEventId(eventId, admin.id))) {
    return apiError('Evento não encontrado', 404)
  }

  try {
    const supabase = getServerClient()
    const { data: existing, error: fetchError } = await supabase
      .from('photos')
      .select('id')
      .eq('event_id', eventId)

    if (fetchError) return apiError(fetchError.message, 500)

    const existingIds = new Set((existing ?? []).map((row) => row.id))
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      return apiError('Lista de fotos inválida', 400)
    }

    const updates = orderedIds.map((id, index) =>
      supabase.from('photos').update({ sort_order: index }).eq('id', id).eq('event_id', eventId)
    )

    const results = await Promise.all(updates)
    const failed = results.find((result) => result.error)
    if (failed?.error) return apiError(failed.error.message, 500)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}
