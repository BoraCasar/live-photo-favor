import { getServerClient } from '@/lib/supabase-server'
import { deleteObjects, publicUrlToStorageKey } from '@/lib/r2'
import { retentionCutoffDate } from '@/lib/retention'

export async function cleanupExpiredEvents(): Promise<{
  deletedEvents: number
  deletedObjects: number
}> {
  const supabase = getServerClient()
  const cutoff = retentionCutoffDate()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, logo_url')
    .lte('event_date', cutoff)

  if (error) throw error
  if (!events?.length) return { deletedEvents: 0, deletedObjects: 0 }

  const keysToDelete: string[] = []

  for (const event of events) {
    const logoKey = publicUrlToStorageKey(event.logo_url)
    if (logoKey) keysToDelete.push(logoKey)

    const { data: photos } = await supabase
      .from('photos')
      .select('storage_key')
      .eq('event_id', event.id)

    for (const photo of photos ?? []) {
      keysToDelete.push(photo.storage_key)
    }
  }

  await deleteObjects(keysToDelete)

  const ids = events.map((e) => e.id)
  const { error: deleteError } = await supabase.from('events').delete().in('id', ids)

  if (deleteError) throw deleteError

  return { deletedEvents: events.length, deletedObjects: keysToDelete.length }
}
