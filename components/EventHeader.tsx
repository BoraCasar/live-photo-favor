'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import EventLogo from '@/components/EventLogo'
import type { Event } from '@/types'
import { eventGalleryPath, eventUploadPath } from '@/lib/event-domain'

interface Props {
  event: Event
  shareUrl: string
  eventSlug: string
  hasPhotos?: boolean
  onOpenPresentation?: () => void
}

export default function EventHeader({
  event,
  shareUrl,
  eventSlug,
  hasPhotos = false,
  onOpenPresentation,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}`

  const openPresentation = () => {
    setMenuOpen(false)
    onOpenPresentation?.()
  }

  return (
    <>
      <header className="sticky top-0 z-20 bg-[var(--cream)] border-b border-[var(--grid-line)]">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="p-2 -ml-2 text-[var(--text-muted)]"
              aria-label="Menu"
            >
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden>
                <path d="M0 1h22M0 8h22M0 15h14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>

            <div className="w-10 h-10 rounded bg-white border border-[var(--grid-line)] overflow-hidden flex-shrink-0 ml-auto">
              <Image
                src={qrUrl}
                alt="QR code do evento"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
          </div>

          <div className="flex items-center justify-center pb-3">
            <EventLogo logoUrl={event.logo_url} size="lg" />
          </div>

          <h1 className="font-script text-center text-4xl text-[var(--text)] leading-tight">
            {event.client_name}
          </h1>
          {event.welcome_message && (
            <p className="font-serif-display text-center text-sm text-[var(--text-muted)] mt-2 px-2 leading-relaxed pb-3">
              {event.welcome_message}
            </p>
          )}
          {!event.welcome_message && <div className="pb-3" />}
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <nav className="absolute left-0 top-0 bottom-0 w-72 bg-[var(--cream)] shadow-xl p-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="self-end text-[var(--text-muted)] mb-4"
              aria-label="Fechar"
            >
              ✕
            </button>
            <Link
              href={eventGalleryPath(eventSlug)}
              onClick={() => setMenuOpen(false)}
              className="py-3 px-4 rounded-xl font-serif-display text-lg text-[var(--text)] hover:bg-[var(--gold-light)]/30"
            >
              Galeria
            </Link>
            <Link
              href={eventUploadPath(eventSlug)}
              onClick={() => setMenuOpen(false)}
              className="py-3 px-4 rounded-xl font-serif-display text-lg text-[var(--text)] hover:bg-[var(--gold-light)]/30"
            >
              Enviar Minha Foto
            </Link>
            <button
              type="button"
              onClick={openPresentation}
              disabled={!hasPhotos}
              className="py-3 px-4 rounded-xl font-serif-display text-lg text-left text-[var(--text)] hover:bg-[var(--gold-light)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apresentação
            </button>
          </nav>
        </div>
      )}
    </>
  )
}
