import { getServerClient } from '@/lib/supabase-server'

export async function getOwnedEventId(eventId: string, adminId: string): Promise<string | null> {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, admin_id')
    .eq('id', eventId)
    .single()

  if (error || !data || data.admin_id !== adminId) return null
  return data.id
}

export async function getOwnedPhoto(
  photoId: string,
  adminId: string
): Promise<{ id: string; event_id: string; storage_key: string } | null> {
  const supabase = getServerClient()
  const { data: photo, error } = await supabase
    .from('photos')
    .select('id, event_id, storage_key')
    .eq('id', photoId)
    .single()

  if (error || !photo) return null

  const ownedEventId = await getOwnedEventId(photo.event_id, adminId)
  if (!ownedEventId) return null

  return photo
}
