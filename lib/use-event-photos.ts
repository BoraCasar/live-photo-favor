'use client'

import { useState, useEffect, useCallback } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import type { Photo } from '@/types'

export function useEventPhotos(eventId: string, initialPhotos: Photo[]) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)

  const addPhoto = useCallback((newPhoto: Photo) => {
    setPhotos((prev) => {
      if (prev.some((p) => p.id === newPhoto.id)) return prev
      return [newPhoto, ...prev]
    })
  }, [])

  useEffect(() => {
    setPhotos(initialPhotos)
  }, [initialPhotos])

  useEffect(() => {
    const supabase = getBrowserClient()
    const r2Base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')

    const channel = supabase
      .channel(`photos:event:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as Photo
          if (!row.approved) return
          addPhoto({ ...row, url: `${r2Base}/${row.storage_key}` })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'photos',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as Photo
          setPhotos((prev) =>
            row.approved
              ? prev.map((p) =>
                  p.id === row.id ? { ...row, url: `${r2Base}/${row.storage_key}` } : p
                )
              : prev.filter((p) => p.id !== row.id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, addPhoto])

  return photos
}
