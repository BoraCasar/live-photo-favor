/** App host — admin UI and all guest event paths live here. */
export const APP_HOST =
  process.env.NEXT_PUBLIC_APP_HOST?.trim() || 'album.boracasar.net.br'

/** @deprecated Path-based routing uses APP_HOST; kept for env compatibility. */
export const EVENT_DOMAIN =
  process.env.NEXT_PUBLIC_EVENT_DOMAIN?.trim() || 'boracasar.net.br'

function appBaseUrl(protocol: 'http' | 'https' = 'https'): string {
  return `${protocol}://${APP_HOST}`
}

/** Guest gallery URL, e.g. https://album.boracasar.net.br/{uuid} */
export function eventUrl(publicToken: string): string {
  return `${appBaseUrl()}/${publicToken}`
}

/** Guest upload URL for an event. */
export function eventUploadUrl(publicToken: string): string {
  return `${appBaseUrl()}/${publicToken}/upload`
}

export function eventGalleryPath(publicToken: string): string {
  return `/${publicToken}`
}

export function eventUploadPath(publicToken: string): string {
  return `/${publicToken}/upload`
}

/** Build share URL from the current request host (works in local dev). */
export function eventShareUrl(publicToken: string, host: string): string {
  const protocol =
    host.includes('localhost') || host.includes('127.0.0.1') || host.includes('lvh.me')
      ? 'http'
      : 'https'
  return `${protocol}://${host}/${publicToken}`
}
