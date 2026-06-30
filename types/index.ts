import type { SlideshowTransition } from '@/lib/slideshow-transition'
import type { SubscriptionStatus } from '@/lib/admin-subscription'

export interface Admin {
  id: string
  email: string
  company_name: string
  created_at: string
  subscription_status?: SubscriptionStatus
  subscription_expires_at?: string | null
}

export interface PlatformAdmin {
  id: string
  email: string
  created_at: string
}

export interface Event {
  id: string
  subdomain: string
  client_name: string
  event_date: string
  logo_url: string | null
  welcome_message: string | null
  slideshow_interval_seconds: number
  slideshow_transition?: SlideshowTransition
  is_active: boolean
  admin_id: string | null
}

export interface Photo {
  id: string
  event_id: string
  storage_key: string
  guest_name: string | null
  caption: string | null
  approved: boolean
  created_at: string
  url?: string
}
