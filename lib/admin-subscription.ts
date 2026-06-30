import type { Admin } from '@/types'
import { getAdminFromSession } from '@/lib/admin-auth'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'inactive'

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing']

function isBypassEmail(email: string): boolean {
  const list = process.env.SUBSCRIPTION_BYPASS_EMAILS?.trim()
  if (!list) return false
  const normalized = email.trim().toLowerCase()
  return list
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized)
}

export function isSubscriptionActive(admin: Admin): boolean {
  if (isBypassEmail(admin.email)) return true

  const status = admin.subscription_status ?? 'inactive'
  if (!ACTIVE_STATUSES.includes(status as SubscriptionStatus)) return false

  if (admin.subscription_expires_at) {
    return new Date(admin.subscription_expires_at) > new Date()
  }

  return true
}

export async function requireActiveAdmin(): Promise<Admin | null> {
  const admin = await getAdminFromSession()
  if (!admin) return null
  if (!isSubscriptionActive(admin)) return null
  return admin
}

export function subscriptionInactiveMessage(): string {
  return 'Assinatura inativa. Entre em contato para ativar seu plano mensal.'
}
