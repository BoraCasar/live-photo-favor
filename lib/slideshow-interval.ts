export const SLIDESHOW_MIN_SECONDS = 1
export const SLIDESHOW_MAX_SECONDS = 120

export function parseSlideshowInterval(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '5'))
  if (Number.isNaN(n)) return 5
  const clamped = Math.min(SLIDESHOW_MAX_SECONDS, Math.max(SLIDESHOW_MIN_SECONDS, n))
  return Math.round(clamped * 10) / 10
}

export function validateSlideshowIntervalInput(value: string): string | null {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return 'Informe um intervalo válido em segundos.'
  if (n < SLIDESHOW_MIN_SECONDS) return `O intervalo mínimo é ${SLIDESHOW_MIN_SECONDS} segundo.`
  if (n > SLIDESHOW_MAX_SECONDS) return `O intervalo máximo é ${SLIDESHOW_MAX_SECONDS} segundos.`
  return null
}

export function slideshowIntervalInputProps() {
  return {
    min: SLIDESHOW_MIN_SECONDS,
    max: SLIDESHOW_MAX_SECONDS,
    step: 'any' as const,
  }
}
