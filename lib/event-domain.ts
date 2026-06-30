/** App host — admin UI and all guest event paths live here. */
export const APP_HOST =
  process.env.NEXT_PUBLIC_APP_HOST?.trim() || 'foto-lembranca.boracasar.net.br'

/** @deprecated Path-based routing uses APP_HOST; kept for env compatibility. */
export const EVENT_DOMAIN =
  process.env.NEXT_PUBLIC_EVENT_DOMAIN?.trim() || 'boracasar.net.br'

function appBaseUrl(protocol: 'http' | 'https' = 'https'): string {
  return `${protocol}://${APP_HOST}`
}

/** Guest gallery URL, e.g. https://foto-lembranca.boracasar.net.br/luana-e-marco */
export function eventUrl(slug: string): string {
  return `${appBaseUrl()}/${slug}`
}

/** Guest upload URL for an event. */
export function eventUploadUrl(slug: string): string {
  return `${appBaseUrl()}/${slug}/upload`
}

export function eventGalleryPath(slug: string): string {
  return `/${slug}`
}

export function eventUploadPath(slug: string): string {
  return `/${slug}/upload`
}

/** Build share URL from the current request host (works in local dev). */
export function eventShareUrl(slug: string, host: string): string {
  const protocol =
    host.includes('localhost') || host.includes('127.0.0.1') || host.includes('lvh.me')
      ? 'http'
      : 'https'
  return `${protocol}://${host}/${slug}`
}
