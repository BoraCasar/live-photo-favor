import { headers } from 'next/headers'
import Link from 'next/link'
import type { Event, Photo } from '@/types'
import { getServerClient } from '@/lib/supabase-server'
import { sortPhotos } from '@/lib/sort-photos'
import EventPage from '@/components/EventPage'
import UploadForm from '@/components/UploadForm'
import { eventShareUrl, eventGalleryPath } from '@/lib/event-domain'

export default async function UploadPage() {
  const headersList = await headers()
  const eventData = headersList.get('x-event-data')
  const event: Event | null = eventData ? JSON.parse(eventData) : null

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--cream)]">
        <p className="text-[var(--text-muted)] font-serif-display">Nenhum evento encontrado.</p>
      </main>
    )
  }

  const host = headersList.get('host') ?? ''
  const shareUrl = eventShareUrl(event.public_token, host)

  const r2Base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')
  const supabase = getServerClient()
  const { data: rows } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', event.id)
    .eq('approved', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(200)

  const initialPhotos: Photo[] = sortPhotos(rows ?? []).map((row) => ({
    ...row,
    url: `${r2Base}/${row.storage_key}`,
  }))

  return (
    <main className="min-h-screen bg-[var(--cream)] pb-10">
      <EventPage
        event={event}
        shareUrl={shareUrl}
        initialPhotos={initialPhotos}
        eventToken={event.public_token}
        showGallery={false}
        showUploadButton={false}
      >
        <div className="max-w-lg mx-auto px-5 pt-4 pb-8">
          <UploadForm event={event} />
          <Link
            href={eventGalleryPath(event.public_token)}
            className="block text-center mt-6 text-sm text-[var(--gold-dark)] font-serif-display"
          >
            ← Voltar para a galeria
          </Link>
        </div>
      </EventPage>
    </main>
  )
}
