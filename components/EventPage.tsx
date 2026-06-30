'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Event, Photo } from '@/types'
import { useEventPhotos } from '@/lib/use-event-photos'
import EventHeader from '@/components/EventHeader'
import PhotoGrid from '@/components/PhotoGrid'
import PresentationSlideshow from '@/components/PresentationSlideshow'

interface Props {
  event: Event
  shareUrl: string
  initialPhotos: Photo[]
  children?: React.ReactNode
  showGallery?: boolean
  showUploadButton?: boolean
}

export default function EventPage({
  event,
  shareUrl,
  initialPhotos,
  children,
  showGallery = true,
  showUploadButton = true,
}: Props) {
  const photos = useEventPhotos(event.id, initialPhotos)
  const [presentationOpen, setPresentationOpen] = useState(false)

  const intervalSeconds = event.slideshow_interval_seconds ?? 5
  const transition = event.slideshow_transition ?? 'cross_dissolve'

  return (
    <>
      <EventHeader
        event={event}
        shareUrl={shareUrl}
        hasPhotos={photos.length > 0}
        onOpenPresentation={() => setPresentationOpen(true)}
      />

      {showGallery && <PhotoGrid photos={photos} />}

      {children}

      {showUploadButton && (
        <div className="fixed bottom-0 inset-x-0 p-4 pb-6 bg-gradient-to-t from-[var(--cream)] via-[var(--cream)] to-transparent pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <Link
              href="/upload"
              className="btn-gold block w-full py-4 rounded-2xl text-center font-script text-2xl transition-transform"
            >
              Enviar Minha Foto
            </Link>
          </div>
        </div>
      )}

      {presentationOpen && (
        <PresentationSlideshow
          photos={photos}
          intervalSeconds={intervalSeconds}
          transition={transition}
          onClose={() => setPresentationOpen(false)}
        />
      )}
    </>
  )
}
