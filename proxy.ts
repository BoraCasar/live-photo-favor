import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { RESERVED_SUBDOMAINS } from '@/lib/subdomain'

function extractSubdomain(hostname: string): string | null {
  // Strip port if present (e.g. localhost:3000)
  const host = hostname.split(':')[0]

  // Running locally — no subdomain-based tenant
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return null
  }

  const parts = host.split('.')
  // Need at least 3 parts: subdomain.domain.tld
  if (parts.length < 3) return null

  const sub = parts[0].toLowerCase()
  return RESERVED_SUBDOMAINS.has(sub) ? null : sub
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = extractSubdomain(hostname)

  // No event subdomain — let the request pass unchanged
  if (!subdomain) {
    return NextResponse.next()
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('subdomain', subdomain)
    .eq('is_active', true)
    .single()

  if (error || !event) {
    // Rewrite to the not-found page (keeps the URL intact)
    const url = request.nextUrl.clone()
    url.pathname = '/not-found'
    return NextResponse.rewrite(url)
  }

  const eventPayload = {
    ...event,
    slideshow_interval_seconds: event.slideshow_interval_seconds ?? 5,
    slideshow_transition: event.slideshow_transition ?? 'cross_dissolve',
  }

  const response = NextResponse.next()
  response.headers.set('x-event-id', event.id)
  response.headers.set('x-event-data', JSON.stringify(eventPayload))
  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
