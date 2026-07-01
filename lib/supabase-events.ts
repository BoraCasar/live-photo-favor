import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { DEFAULT_SLIDESHOW_TRANSITION } from '@/lib/slideshow-transition'

const SLIDESHOW_COLUMN = 'slideshow_interval_seconds'
const TRANSITION_COLUMN = 'slideshow_transition'

const OPTIONAL_COLUMNS = [SLIDESHOW_COLUMN, TRANSITION_COLUMN] as const

export function isEventColumnMissing(
  error: { message?: string } | null,
  column: string
): boolean {
  const msg = error?.message?.toLowerCase() ?? ''
  return (
    msg.includes(column.toLowerCase()) &&
    (msg.includes('schema cache') || msg.includes('does not exist'))
  )
}

export function isSlideshowColumnMissing(error: { message?: string } | null): boolean {
  return isEventColumnMissing(error, SLIDESHOW_COLUMN)
}

export function stripEventColumn<T extends Record<string, unknown>>(
  payload: T,
  column: string
): Omit<T, typeof column> {
  const { [column]: _, ...rest } = payload
  return rest as Omit<T, typeof column>
}

export function stripSlideshowField<T extends Record<string, unknown>>(
  payload: T
): Omit<T, typeof SLIDESHOW_COLUMN> {
  return stripEventColumn(payload, SLIDESHOW_COLUMN) as Omit<T, typeof SLIDESHOW_COLUMN>
}

export function withEventDefaults<T extends Record<string, unknown>>(row: T): T {
  let result = { ...row }
  if (!(SLIDESHOW_COLUMN in result) || result[SLIDESHOW_COLUMN] == null) {
    result = { ...result, [SLIDESHOW_COLUMN]: 5 }
  }
  if (!(TRANSITION_COLUMN in result) || result[TRANSITION_COLUMN] == null) {
    result = { ...result, [TRANSITION_COLUMN]: DEFAULT_SLIDESHOW_TRANSITION }
  }
  return result
}

export function withDefaultSlideshowInterval<T extends Record<string, unknown>>(row: T): T {
  return withEventDefaults(row)
}

type EventsClient = SupabaseClient<Database>
type EventInsert = Database['public']['Tables']['events']['Insert']
type EventUpdate = Database['public']['Tables']['events']['Update']

async function mutateEventRow<T extends Record<string, unknown>>(
  mutate: (payload: T) => Promise<{
    data: unknown
    error: { message?: string } | null
  }>,
  payload: T
) {
  let result = await mutate(payload)
  let current = payload

  for (const column of OPTIONAL_COLUMNS) {
    if (
      result.error &&
      isEventColumnMissing(result.error, column) &&
      column in current
    ) {
      current = stripEventColumn(current, column) as T
      result = await mutate(current)
    }
  }

  if (result.data && typeof result.data === 'object') {
    return {
      data: withEventDefaults(result.data as Record<string, unknown>),
      error: result.error,
    }
  }
  return result
}

export async function insertEventRow(supabase: EventsClient, payload: EventInsert) {
  return mutateEventRow(
    async (row) => supabase.from('events').insert(row).select().single(),
    payload
  )
}

export async function updateEventRow(
  supabase: EventsClient,
  eventId: string,
  adminId: string,
  updates: EventUpdate
) {
  return mutateEventRow(
    async (row) =>
      supabase
        .from('events')
        .update(row)
        .eq('id', eventId)
        .eq('admin_id', adminId)
        .select()
        .single(),
    updates
  )
}

export async function listAdminEvents(supabase: EventsClient, adminId: string) {
  const result = await supabase
    .from('events')
    .select('*')
    .eq('admin_id', adminId)
    .order('event_date', { ascending: false })

  if (result.error && isSlideshowColumnMissing(result.error)) {
    const fallback = await supabase
      .from('events')
      .select(
        'id, public_token, subdomain, client_name, event_date, logo_url, welcome_message, is_active, admin_id, created_at, primary_color'
      )
      .eq('admin_id', adminId)
      .order('event_date', { ascending: false })

    if (fallback.data) {
      return { ...fallback, data: fallback.data.map((row) => withEventDefaults(row)) }
    }
    return fallback
  }

  if (result.data) {
    return { ...result, data: result.data.map((row) => withEventDefaults(row)) }
  }
  return result
}
