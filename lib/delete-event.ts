import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { deleteObjects, publicUrlToStorageKey } from '@/lib/r2'

export async function deleteEventWithAssets(
  supabase: SupabaseClient<Database>,
  eventId: string
): Promise<void> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, logo_url')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    throw new Error('Evento não encontrado')
  }

  const keysToDelete: string[] = []
  const logoKey = publicUrlToStorageKey(event.logo_url)
  if (logoKey) keysToDelete.push(logoKey)

  const { data: photos } = await supabase
    .from('photos')
    .select('storage_key')
    .eq('event_id', eventId)

  for (const photo of photos ?? []) {
    keysToDelete.push(photo.storage_key)
  }

  await deleteObjects(keysToDelete)

  const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId)
  if (deleteError) throw deleteError
}
