import Link from 'next/link'
import { headers } from 'next/headers'
import type { Event, Photo } from '@/types'
import { getServerClient } from '@/lib/supabase-server'
import EventPage from '@/components/EventPage'
import { eventShareUrl } from '@/lib/event-domain'
import { APP_NAME } from '@/lib/theme'

export const dynamic = 'force-dynamic'

async function loadEventPhotos(eventId: string): Promise<Photo[]> {
  const r2Base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')
  const supabase = getServerClient()
  const { data: rows } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', eventId)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(200)

  return (rows ?? []).map((row) => ({
    ...row,
    url: `${r2Base}/${row.storage_key}`,
  }))
}

export default async function HomePage() {
  const headersList = await headers()
  const eventData = headersList.get('x-event-data')
  const event: Event | null = eventData ? JSON.parse(eventData) : null

  if (!event) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--cream)]">
        <div className="text-center max-w-md font-serif-display">
          <h1 className="font-script text-5xl text-[var(--text)] mb-4">{APP_NAME}</h1>
          <p className="text-[var(--text-muted)] text-lg mb-6">
            Escaneie o QR code no seu evento para enviar e ver fotos em tempo real.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Nenhum evento encontrado para este endereço. Verifique o link que você recebeu.
          </p>
          <Link
            href="/admin"
            className="inline-block mt-8 text-sm text-[var(--gold-dark)] underline"
          >
            Área do administrador
          </Link>
        </div>
      </main>
    )
  }

  const host = headersList.get('host') ?? ''
  const shareUrl = eventShareUrl(event.subdomain, host)
  const initialPhotos = await loadEventPhotos(event.id)

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <EventPage
        event={event}
        shareUrl={shareUrl}
        initialPhotos={initialPhotos}
        eventSlug={event.subdomain}
      />
    </main>
  )
}
