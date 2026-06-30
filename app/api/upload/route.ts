import { NextResponse } from 'next/server'
import { putObject } from '@/lib/r2'
import { getServerClient, supabaseConnectionErrorMessage } from '@/lib/supabase-server'
import { checkUploadRateLimit, getUploadClientId } from '@/lib/upload-rate-limit'
import { apiError } from '@/lib/api-errors'

export async function POST(request: Request) {
  const clientId = getUploadClientId(request)
  if (!checkUploadRateLimit(clientId)) {
    return apiError('Muitos envios seguidos. Aguarde um momento e tente novamente.', 429)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return apiError('Dados de envio inválidos', 400)
  }

  const file = formData.get('file')
  const eventId = formData.get('eventId')
  const guestName = formData.get('guestName')
  const caption = formData.get('caption')

  if (!(file instanceof File) || typeof eventId !== 'string' || !eventId) {
    return apiError('Arquivo e evento são obrigatórios', 400)
  }

  const contentType = file.type || 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    return apiError('Apenas imagens podem ser enviadas', 400)
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

    const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const storageKey = `events/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await putObject(storageKey, buffer, contentType)

    const { error: dbError } = await supabase.from('photos').insert({
      event_id: eventId,
      storage_key: storageKey,
      guest_name: typeof guestName === 'string' && guestName.trim() ? guestName.trim() : null,
      caption: typeof caption === 'string' && caption.trim() ? caption.trim() : null,
      approved: true,
    })

    if (dbError) {
      return apiError(dbError.message, 500)
    }

    return NextResponse.json({ ok: true, storageKey })
  } catch (err: unknown) {
    console.error('Upload failed:', err)
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}
