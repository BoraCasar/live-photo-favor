import { NextResponse } from 'next/server'
import { generatePresignedPutUrl } from '@/lib/r2'
import { getServerClient } from '@/lib/supabase-server'
import { checkUploadRateLimit, getUploadClientId } from '@/lib/upload-rate-limit'
import { apiError } from '@/lib/api-errors'

export async function POST(request: Request) {
  const clientId = getUploadClientId(request)
  if (!checkUploadRateLimit(clientId)) {
    return apiError('Muitos envios seguidos. Aguarde um momento e tente novamente.', 429)
  }

  let body: { eventId?: string; contentType?: string; ext?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const { eventId, contentType, ext } = body
  if (!eventId || !contentType) {
    return apiError('Parâmetros obrigatórios ausentes', 400)
  }

  if (!contentType.startsWith('image/')) {
    return apiError('Apenas imagens podem ser enviadas', 400)
  }

  const supabase = getServerClient()
  const { data: event, error } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('is_active', true)
    .single()

  if (error || !event) {
    return apiError('Evento não encontrado', 404)
  }

  const safeExt = (ext || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const storageKey = `events/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`

  const presignedUrl = await generatePresignedPutUrl(storageKey, contentType)

  return NextResponse.json({ presignedUrl, storageKey })
}
