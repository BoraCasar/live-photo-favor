'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Event } from '@/types'
import { theme } from '@/lib/theme'
import { translateApiError } from '@/lib/api-errors'

interface Props {
  event: Event
}

type FileUploadStatus = 'pending' | 'compressing' | 'uploading' | 'saving' | 'done' | 'error'

interface QueuedFile {
  id: string
  file: File
  preview: string
  previewFailed: boolean
  status: FileUploadStatus
  error?: string
}

const INPUT_ID = 'photo-upload-input'
const MAX_PHOTOS = 20

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && err.message === 'Failed to fetch')
}

async function uploadViaServer(
  compressed: File,
  originalName: string,
  eventId: string,
  name: string,
  photoCaption: string
) {
  const formData = new FormData()
  formData.append('file', compressed, originalName)
  formData.append('eventId', eventId)
  if (name.trim()) formData.append('guestName', name.trim())
  if (photoCaption.trim()) formData.append('caption', photoCaption.trim())

  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(translateApiError(body.error || 'Não foi possível enviar a foto'))
  }
}

async function uploadSingleFile(
  fileToUpload: File,
  eventId: string,
  name: string,
  photoCaption: string,
  onStatus: (status: FileUploadStatus) => void
) {
  onStatus('compressing')

  const { default: imageCompression } = await import('browser-image-compression')
  let compressed: File
  try {
    compressed = await imageCompression(fileToUpload, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2048,
      useWebWorker: typeof Worker !== 'undefined',
    })
  } catch {
    compressed = fileToUpload
  }

  onStatus('uploading')

  const contentType = compressed.type || 'image/jpeg'
  const ext = fileToUpload.name.split('.').pop() || 'jpg'

  const presignRes = await fetch('/api/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, contentType, ext }),
  })

  const presignBody = await presignRes.json().catch(() => ({}))
  if (!presignRes.ok) {
    throw new Error(translateApiError(presignBody.error || 'Não foi possível obter a URL de upload'))
  }

  const { presignedUrl, storageKey } = presignBody

  let directUploadOk = false
  try {
    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: compressed,
    })
    directUploadOk = uploadRes.ok
  } catch (err) {
    if (!isNetworkError(err)) throw err
  }

  if (directUploadOk) {
    onStatus('saving')

    const confirmRes = await fetch('/api/photos/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        storageKey,
        guestName: name,
        caption: photoCaption,
      }),
    })

    const confirmBody = await confirmRes.json().catch(() => ({}))
    if (!confirmRes.ok) {
      throw new Error(translateApiError(confirmBody.error || 'Não foi possível salvar a foto'))
    }
  } else {
    await uploadViaServer(compressed, fileToUpload.name, eventId, name, photoCaption)
  }
}

export default function UploadForm({ event }: Props) {
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [batchComplete, setBatchComplete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const queueRef = useRef<QueuedFile[]>([])
  const processingRef = useRef(false)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])
  const isBusy = queue.some((item) =>
    ['compressing', 'uploading', 'saving'].includes(item.status)
  )
  const doneCount = queue.filter((item) => item.status === 'done').length
  const errorCount = queue.filter((item) => item.status === 'error').length

  const updateItem = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setQueue((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      queueRef.current = updated
      return updated
    })
  }, [])

  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    setBatchComplete(false)
    setErrorMessage('')

    try {
      while (true) {
        const next = queueRef.current.find((item) => item.status === 'pending')
        if (!next) break

        try {
          await uploadSingleFile(next.file, event.id, '', '', (status) => {
            updateItem(next.id, { status, error: undefined })
          })
          updateItem(next.id, { status: 'done', error: undefined })
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? translateApiError(
                  err.message === 'Failed to fetch'
                    ? 'Não foi possível conectar ao servidor.'
                    : err.message
                )
              : 'Algo deu errado.'
          updateItem(next.id, { status: 'error', error: message })
        }
      }
    } finally {
      processingRef.current = false
      setBatchComplete(true)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [event.id, updateItem])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? [])
      if (!selected.length) return

      const remaining = MAX_PHOTOS - queue.filter((item) => item.status !== 'done').length
      const toAdd = selected.slice(0, Math.max(0, remaining))

      if (toAdd.length < selected.length) {
        setErrorMessage(`Máximo de ${MAX_PHOTOS} fotos por vez.`)
      } else {
        setErrorMessage('')
      }

      if (!toAdd.length) return

      const newItems: QueuedFile[] = toAdd.map((file) => ({
        id: createId(),
        file,
        preview: URL.createObjectURL(file),
        previewFailed: false,
        status: 'pending',
      }))

      setQueue((prev) => {
        const updated = [...prev, ...newItems]
        queueRef.current = updated
        return updated
      })
      void processQueue()
    },
    [queue, processQueue]
  )

  const handleRetryFailed = () => {
    setQueue((prev) => {
      const updated = prev.map((item) =>
        item.status === 'error' ? { ...item, status: 'pending' as const, error: undefined } : item
      )
      queueRef.current = updated
      return updated
    })
    void processQueue()
  }

  const handleReset = () => {
    queue.forEach((item) => URL.revokeObjectURL(item.preview))
    setQueue([])
    setBatchComplete(false)
    setErrorMessage('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const statusLabel = (item: QueuedFile): string => {
    switch (item.status) {
      case 'compressing':
        return 'Comprimindo…'
      case 'uploading':
        return 'Enviando…'
      case 'saving':
        return 'Salvando…'
      case 'done':
        return 'Enviada'
      case 'error':
        return 'Erro'
      default:
        return 'Aguardando…'
    }
  }

  const hasQueue = queue.length > 0
  const allDone = hasQueue && queue.every((item) => item.status === 'done')

  return (
    <div className="flex flex-col gap-5">
      <label
        htmlFor={INPUT_ID}
        className={`relative border-2 border-dashed rounded-2xl overflow-hidden flex items-center justify-center min-h-[160px] bg-gray-50 transition cursor-pointer active:bg-gray-100`}
        style={{ borderColor: hasQueue ? theme.gold : '#D1D5DB' }}
      >
        <div className="text-center p-8">
          <div className="text-5xl mb-3">📷</div>
          <p className="text-gray-600 font-medium">
            {hasQueue ? 'Toque para adicionar mais fotos' : 'Toque para escolher fotos'}
          </p>
          <p className="text-gray-400 text-sm mt-1">Câmera ou galeria — selecione várias de uma vez</p>
        </div>

        {allDone && batchComplete && (
          <div className="absolute inset-0 bg-green-600/80 flex flex-col items-center justify-center text-white">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold">
              {doneCount === 1 ? 'Foto compartilhada!' : `${doneCount} fotos compartilhadas!`}
            </p>
          </div>
        )}
      </label>

      <input
        id={INPUT_ID}
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={queue.filter((item) => item.status !== 'done').length >= MAX_PHOTOS}
        onChange={handleFileChange}
      />

      {hasQueue && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-600 font-medium">
              {isBusy
                ? `Enviando ${doneCount + 1} de ${queue.length}…`
                : `${doneCount} de ${queue.length} enviada${doneCount !== 1 ? 's' : ''}`}
            </p>
            {errorCount > 0 && !isBusy && (
              <p className="text-red-500">{errorCount} com erro</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {queue.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
              >
                {!item.previewFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                    onError={() => updateItem(item.id, { previewFailed: true })}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>
                )}

                {item.status !== 'pending' && item.status !== 'done' && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-1">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                    <p className="text-[10px] font-medium text-center leading-tight">
                      {statusLabel(item)}
                    </p>
                  </div>
                )}

                {item.status === 'done' && (
                  <div className="absolute inset-0 bg-green-600/70 flex items-center justify-center text-white text-xl">
                    ✓
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-red-600/70 flex items-center justify-center text-white text-xs font-medium p-1 text-center">
                    Erro
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasQueue && !batchComplete && (
        <p className="text-gray-400 text-xs text-center -mt-2">
          Selecione uma ou várias fotos da galeria do seu celular.
        </p>
      )}

      {errorMessage && (
        <p className="text-red-500 text-sm text-center">{errorMessage}</p>
      )}

      {batchComplete && doneCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold">
            {doneCount === 1 ? 'Foto compartilhada! 🎉' : `${doneCount} fotos compartilhadas! 🎉`}
          </p>
          <p className="text-green-600 text-sm mt-1">Veja na galeria em tempo real</p>
        </div>
      )}

      {batchComplete && errorCount > 0 && !isBusy && (
        <button
          type="button"
          onClick={handleRetryFailed}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-md active:scale-95 transition-transform btn-gold font-serif-display"
        >
          Tentar novamente ({errorCount} foto{errorCount !== 1 ? 's' : ''})
        </button>
      )}

      {batchComplete && !isBusy && (
        <button
          type="button"
          onClick={handleReset}
          className="w-full py-3 rounded-2xl font-semibold text-base border-2 bg-white active:scale-95 transition-transform font-serif-display border-[var(--gold)] text-[var(--gold-dark)]"
        >
          Enviar mais fotos
        </button>
      )}
    </div>
  )
}
