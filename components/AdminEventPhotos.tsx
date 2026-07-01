'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { Event, Photo } from '@/types'
import { translateApiError } from '@/lib/api-errors'
import { sortPhotos } from '@/lib/sort-photos'

interface Props {
  event: Event
  onBack: () => void
  onEdit: () => void
}

export default function AdminEventPhotos({ event, onBack, onEdit }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/photos?eventId=${event.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(translateApiError(String(data.error || 'Erro ao carregar fotos')))
      setPhotos(sortPhotos((data.photos as Photo[]) ?? []))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fotos')
    } finally {
      setLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  const persistOrder = async (ordered: Photo[]) => {
    setSavingOrder(true)
    setError('')
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          orderedIds: ordered.map((photo) => photo.id),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(translateApiError(String(data.error || 'Erro ao reordenar')))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao reordenar')
      await loadPhotos()
    } finally {
      setSavingOrder(false)
    }
  }

  const reorderPhotos = (fromId: string, toId: string) => {
    if (fromId === toId) return
    setPhotos((prev) => {
      const fromIndex = prev.findIndex((photo) => photo.id === fromId)
      const toIndex = prev.findIndex((photo) => photo.id === toId)
      if (fromIndex < 0 || toIndex < 0) return prev

      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      void persistOrder(next)
      return next
    })
  }

  const deletePhoto = async (photoId: string) => {
    if (!window.confirm('Excluir esta foto permanentemente?')) return

    setDeletingId(photoId)
    setError('')
    try {
      const res = await fetch(`/api/admin/photos?id=${photoId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(translateApiError(String(data.error || 'Erro ao excluir')))
      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir foto')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[var(--gold-dark)] font-serif-display hover:underline"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm text-[var(--text-muted)] font-serif-display hover:text-[var(--gold-dark)]"
        >
          Editar evento
        </button>
      </div>

      <div className="mb-5">
        <h2 className="font-serif-display font-semibold text-xl text-[var(--text)]">{event.client_name}</h2>
        <p className="text-sm text-[var(--text-muted)] font-serif-display mt-1">
          Arraste para reordenar · {photos.length} foto{photos.length === 1 ? '' : 's'}
          {savingOrder ? ' · salvando ordem…' : ''}
        </p>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-center py-16 text-[var(--text-muted)] font-serif-display">Carregando fotos…</p>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)] font-serif-display">
          <p className="mb-2">Nenhuma foto ainda.</p>
          <p className="text-sm">As fotos enviadas pelos convidados aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => setDraggingId(photo.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggingId) reorderPhotos(draggingId, photo.id)
                setDraggingId(null)
              }}
              className={`relative aspect-square rounded-xl overflow-hidden border bg-[var(--cream)] group cursor-grab active:cursor-grabbing ${
                draggingId === photo.id
                  ? 'border-[var(--gold-dark)] opacity-60'
                  : 'border-[var(--grid-line)]'
              }`}
            >
              {photo.url && (
                <Image
                  src={photo.url}
                  alt={photo.guest_name ?? 'Foto do evento'}
                  fill
                  className="object-cover pointer-events-none"
                  unoptimized
                  draggable={false}
                />
              )}
              <div className="absolute inset-x-0 top-0 p-2 flex justify-between items-start sm:opacity-0 sm:group-hover:opacity-100 transition">
                <span className="text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full font-serif-display">
                  ⋮⋮
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void deletePhoto(photo.id)
                  }}
                  disabled={deletingId === photo.id}
                  className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  aria-label="Excluir foto"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v11a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
