/** Guest event URLs: `{subdomain}.{EVENT_DOMAIN}` e.g. casamento.boracasar.net.br */
export const EVENT_DOMAIN =
  process.env.NEXT_PUBLIC_EVENT_DOMAIN?.trim() || 'boracasar.net.br'

/** Admin app URL (password-reset links). Production: https://foto-lembranca.boracasar.net.br */
export const APP_HOST =
  process.env.NEXT_PUBLIC_APP_HOST?.trim() || 'foto-lembranca.boracasar.net.br'

export function eventUrl(subdomain: string): string {
  return `https://${subdomain}.${EVENT_DOMAIN}`
}
