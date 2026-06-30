'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Photo } from '@/types'
import { parseSlideshowInterval } from '@/lib/slideshow-interval'
import {
  parseSlideshowTransition,
  type SlideshowTransition,
} from '@/lib/slideshow-transition'

const TRANSITION_MS = 500

interface Props {
  photos: Photo[]
  intervalSeconds: number
  transition: SlideshowTransition
  onClose: () => void
}

export default function PresentationSlideshow({
  photos,
  intervalSeconds,
  transition,
  onClose,
}: Props) {
  const safeTransition = parseSlideshowTransition(transition)
  const safeInterval = parseSlideshowInterval(intervalSeconds)

  const [index, setIndex] = useState(0)
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null)
  const [blendActive, setBlendActive] = useState(false)
  const [fadeVisible, setFadeVisible] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(false)
  const indexRef = useRef(0)

  const goNext = useCallback(() => {
    if (photos.length <= 1) return
    const current = indexRef.current
    const next = (current + 1) % photos.length

    if (safeTransition === 'cut') {
      indexRef.current = next
      setIndex(next)
      return
    }

    if (safeTransition === 'fade_black') {
      setFadeVisible(false)
      window.setTimeout(() => {
        indexRef.current = next
        setIndex(next)
        setFadeVisible(true)
      }, TRANSITION_MS)
      return
    }

    setOutgoingIndex(current)
    indexRef.current = next
    setIndex(next)
    setBlendActive(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setBlendActive(true))
    })
    window.setTimeout(() => {
      setOutgoingIndex(null)
      setBlendActive(false)
    }, TRANSITION_MS)
  }, [photos.length, safeTransition])

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (photos.length <= 1) return
    const id = window.setInterval(goNext, safeInterval * 1000)
    return () => window.clearInterval(id)
  }, [photos.length, safeInterval, goNext])

  useEffect(() => {
    if (index >= photos.length && photos.length > 0) {
      setIndex(0)
      indexRef.current = 0
    }
  }, [photos.length, index])

  const current = photos[index]
  const imageClass =
    'absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-in-out'

  return (
    <div
      className="fixed inset-0 z-[60] bg-black"
      onClick={() => setControlsVisible((v) => !v)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className={`absolute top-4 right-4 z-10 text-white/80 hover:text-white text-sm font-serif-display px-3 py-2 rounded-lg bg-black/40 transition-opacity duration-200 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!controlsVisible}
        tabIndex={controlsVisible ? 0 : -1}
      >
        Fechar ✕
      </button>

      {photos.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <p className="text-white/70 font-serif-display text-lg text-center">
            Nenhuma foto na galeria ainda.
          </p>
        </div>
      ) : (
        <div className="absolute inset-0">
          {safeTransition === 'cross_dissolve' ? (
            <>
              {outgoingIndex !== null && photos[outgoingIndex] && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photos[outgoingIndex].url}
                  alt=""
                  aria-hidden
                  className={`${imageClass} ${blendActive ? 'opacity-0' : 'opacity-100'}`}
                />
              )}
              {current && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={current.url}
                  alt={current.caption || 'Foto do evento'}
                  className={`${imageClass} ${
                    outgoingIndex !== null
                      ? blendActive
                        ? 'opacity-100'
                        : 'opacity-0'
                      : 'opacity-100'
                  }`}
                />
              )}
            </>
          ) : (
            current && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={safeTransition === 'cut' ? current.id : undefined}
                src={current.url}
                alt={current.caption || 'Foto do evento'}
                className={`${imageClass} ${
                  safeTransition === 'fade_black'
                    ? fadeVisible
                      ? 'opacity-100'
                      : 'opacity-0'
                    : 'opacity-100'
                }`}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
