import { NextResponse } from 'next/server'
import { getAdminFromSession } from '@/lib/admin-auth'
import { isSubscriptionActive, subscriptionInactiveMessage } from '@/lib/admin-subscription'
import { getServerClient, supabaseConnectionErrorMessage } from '@/lib/supabase-server'
import { insertEventRow, listAdminEvents, updateEventRow } from '@/lib/supabase-events'
import { apiError } from '@/lib/api-errors'
import { parseSlideshowInterval } from '@/lib/slideshow-interval'
import { parseSlideshowTransition } from '@/lib/slideshow-transition'
import { putObject, getPublicUrl } from '@/lib/r2'
import {
  allocateUniqueSubdomain,
  isSubdomainDuplicateError,
  SubdomainValidationError,
} from '@/lib/subdomain'

async function requireSubscribedAdmin() {
  const admin = await getAdminFromSession()
  if (!admin) return { error: apiError('Unauthorized', 401) as ReturnType<typeof apiError> }
  if (!isSubscriptionActive(admin)) {
    return { error: apiError(subscriptionInactiveMessage(), 402) as ReturnType<typeof apiError> }
  }
  return { admin }
}

async function getOwnedEvent(eventId: string, adminId: string) {
  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, admin_id')
    .eq('id', eventId)
    .single()

  if (error || !data || data.admin_id !== adminId) return null
  return data
}

export async function GET() {
  const auth = await requireSubscribedAdmin()
  if ('error' in auth && auth.error) return auth.error
  const admin = auth.admin!

  try {
    const supabase = getServerClient()
    const { data, error } = await listAdminEvents(supabase, admin.id)

    if (error) return apiError(error.message ?? 'Erro ao salvar evento', 500)
    return NextResponse.json({ events: data ?? [], admin })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}

export async function POST(request: Request) {
  const auth = await requireSubscribedAdmin()
  if ('error' in auth && auth.error) return auth.error
  const admin = auth.admin!

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const { subdomain, client_name, event_date, welcome_message, slideshow_interval_seconds, slideshow_transition } = body
  if (!subdomain || !client_name || !event_date) {
    return apiError('subdomain, client_name, and event_date are required', 400)
  }

  const interval = parseSlideshowInterval(slideshow_interval_seconds)
  const transition = parseSlideshowTransition(slideshow_transition)

  try {
    const supabase = getServerClient()
    let allocation = await allocateUniqueSubdomain(supabase, String(subdomain))

    const insertPayload = {
      subdomain: allocation.subdomain,
      client_name: String(client_name),
      event_date: String(event_date),
      welcome_message: welcome_message ? String(welcome_message) : null,
      slideshow_interval_seconds: interval,
      slideshow_transition: transition,
      admin_id: admin.id,
      is_active: true,
    }

    let { data, error } = await insertEventRow(supabase, insertPayload)

    if (error && isSubdomainDuplicateError(error)) {
      allocation = await allocateUniqueSubdomain(supabase, String(subdomain))
      ;({ data, error } = await insertEventRow(supabase, {
        ...insertPayload,
        subdomain: allocation.subdomain,
      }))
    }

    if (error) return apiError(error.message ?? 'Erro ao salvar evento', 500)
    return NextResponse.json(
      {
        event: data,
        subdomain: allocation.subdomain,
        subdomainAdjusted: allocation.adjusted,
        requestedSubdomain: allocation.requestedSubdomain,
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof SubdomainValidationError) {
      return apiError(err.message, 400)
    }
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSubscribedAdmin()
  if ('error' in auth && auth.error) return auth.error
  const admin = auth.admin!

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('id')
  if (!eventId) {
    return apiError('id required', 400)
  }

  if (!(await getOwnedEvent(eventId, admin.id))) {
    return apiError('Evento não encontrado', 404)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const updates: {
    client_name?: string
    event_date?: string
    welcome_message?: string | null
    slideshow_interval_seconds?: number
    slideshow_transition?: string
    is_active?: boolean
    logo_url?: string | null
  } = {}
  if (body.client_name !== undefined) updates.client_name = String(body.client_name)
  if (body.event_date !== undefined) updates.event_date = String(body.event_date)
  if (body.welcome_message !== undefined) {
    updates.welcome_message = body.welcome_message ? String(body.welcome_message) : null
  }
  if (body.slideshow_interval_seconds !== undefined) {
    updates.slideshow_interval_seconds = parseSlideshowInterval(body.slideshow_interval_seconds)
  }
  if (body.slideshow_transition !== undefined) {
    updates.slideshow_transition = parseSlideshowTransition(body.slideshow_transition)
  }
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)
  if (body.logo_url !== undefined) {
    updates.logo_url = body.logo_url ? String(body.logo_url) : null
  }

  if (!Object.keys(updates).length) {
    return apiError('Nada para atualizar', 400)
  }

  try {
    const supabase = getServerClient()
    const { data, error } = await updateEventRow(supabase, eventId, admin.id, updates)

    if (error) return apiError(error.message ?? 'Erro ao salvar evento', 500)
    return NextResponse.json({ event: data })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}

export async function PUT(request: Request) {
  const auth = await requireSubscribedAdmin()
  if ('error' in auth && auth.error) return auth.error
  const admin = auth.admin!

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return apiError('Invalid form data', 400)
  }

  const file = formData.get('file')
  const eventId = formData.get('eventId')
  if (!(file instanceof File) || typeof eventId !== 'string' || !eventId) {
    return apiError('Arquivo e eventId são obrigatórios', 400)
  }

  if (!(await getOwnedEvent(eventId, admin.id))) {
    return apiError('Evento não encontrado', 404)
  }

  const contentType = file.type || 'image/png'
  if (!contentType.startsWith('image/')) {
    return apiError('Apenas imagens são permitidas', 400)
  }

  const ext = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const storageKey = `logos/${eventId}/logo-${Date.now()}.${ext}`

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await putObject(storageKey, buffer, contentType)
    const logoUrl = getPublicUrl(storageKey)

    const supabase = getServerClient()
    const { data, error } = await supabase
      .from('events')
      .update({ logo_url: logoUrl })
      .eq('id', eventId)
      .eq('admin_id', admin.id)
      .select()
      .single()

    if (error) return apiError(error.message ?? 'Erro ao salvar evento', 500)
    return NextResponse.json({ event: data, logo_url: logoUrl })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}
