'use client'

import { useState, useEffect, useCallback } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { sortPhotos } from '@/lib/sort-photos'
import type { Photo } from '@/types'

export function useEventPhotos(eventId: string, initialPhotos: Photo[]) {
  const [photos, setPhotos] = useState<Photo[]>(sortPhotos(initialPhotos))

  const upsertPhoto = useCallback((newPhoto: Photo) => {
    setPhotos((prev) => {
      const without = prev.filter((p) => p.id !== newPhoto.id)
      return sortPhotos([...without, newPhoto])
    })
  }, [])

  useEffect(() => {
    setPhotos(sortPhotos(initialPhotos))
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
          upsertPhoto({ ...row, url: `${r2Base}/${row.storage_key}` })
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
          setPhotos((prev) => {
            if (!row.approved) {
              return prev.filter((p) => p.id !== row.id)
            }
            const without = prev.filter((p) => p.id !== row.id)
            return sortPhotos([...without, { ...row, url: `${r2Base}/${row.storage_key}` }])
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'photos',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.old as { id?: string }
          if (!row.id) return
          setPhotos((prev) => prev.filter((p) => p.id !== row.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, upsertPhoto])

  return photos
}
