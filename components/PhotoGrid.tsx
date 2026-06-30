'use client'

import { useState } from 'react'
import type { Photo } from '@/types'

interface Props {
  photos: Photo[]
}

function PhotoCard({ photo }: { photo: Photo }) {
  return (
    <div className="photo-card-enter relative rounded-lg overflow-hidden bg-[var(--gold-light)]/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption || 'Foto do evento'}
        className="w-full object-cover"
        loading="lazy"
      />
    </div>
  )
}

export default function PhotoGrid({ photos }: Props) {
  const [lightbox, setLightbox] = useState<Photo | null>(null)

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 grid-pattern min-h-[50vh]">
        <svg
          width="80"
          height="64"
          viewBox="0 0 80 64"
          fill="none"
          className="text-[var(--gold)] mb-6"
          aria-hidden
        >
          <rect x="8" y="18" width="64" height="44" rx="4" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="38" r="12" stroke="currentColor" strokeWidth="2" />
          <path d="M28 18 L34 10 H46 L52 18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <p className="font-serif-display text-xl text-[var(--text)] text-center">
          Seja o primeiro a compartilhar
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="masonry-grid pb-28">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightbox(photo)}
            className="masonry-item w-full text-left focus:outline-none focus:ring-2 focus:ring-[var(--gold)] rounded-lg"
          >
            <PhotoCard photo={photo} />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption || 'Foto'}
              className="w-full rounded-xl object-contain max-h-[80vh]"
            />
            {(lightbox.guest_name || lightbox.caption) && (
              <div className="mt-3 text-center font-serif-display">
                {lightbox.guest_name && (
                  <p className="text-white font-semibold">{lightbox.guest_name}</p>
                )}
                {lightbox.caption && (
                  <p className="text-gray-300 text-sm mt-1">{lightbox.caption}</p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="mt-4 w-full py-3 rounded-xl text-white border border-white/30 hover:bg-white/10 transition font-serif-display"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
