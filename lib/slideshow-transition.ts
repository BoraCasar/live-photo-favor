export const SLIDESHOW_TRANSITIONS = ['cross_dissolve', 'fade_black', 'cut'] as const

export type SlideshowTransition = (typeof SLIDESHOW_TRANSITIONS)[number]

export const DEFAULT_SLIDESHOW_TRANSITION: SlideshowTransition = 'cross_dissolve'

export const SLIDESHOW_TRANSITION_LABELS: Record<SlideshowTransition, string> = {
  cross_dissolve: 'Dissolução cruzada',
  fade_black: 'Escurecer (preto)',
  cut: 'Corte seco',
}

export function parseSlideshowTransition(value: unknown): SlideshowTransition {
  if (
    typeof value === 'string' &&
    SLIDESHOW_TRANSITIONS.includes(value as SlideshowTransition)
  ) {
    return value as SlideshowTransition
  }
  return DEFAULT_SLIDESHOW_TRANSITION
}
