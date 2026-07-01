import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function nextPhotoSortOrder(
  supabase: SupabaseClient<Database>,
  eventId: string
): Promise<number> {
  const { data } = await supabase
    .from('photos')
    .select('sort_order')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.sort_order ?? -1) + 1
}
