import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { isPublicEventToken } from '@/lib/event-token'

type EventRoute = { token: string; section: 'gallery' | 'upload' }

function extractEventRoute(pathname: string): EventRoute | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const token = segments[0]
  if (!isPublicEventToken(token)) return null

  if (segments.length === 1) {
    return { token, section: 'gallery' }
  }

  if (segments.length === 2 && segments[1] === 'upload') {
    return { token, section: 'upload' }
  }

  return null
}

export async function proxy(request: NextRequest) {
  const route = extractEventRoute(request.nextUrl.pathname)

  if (!route) {
    return NextResponse.next()
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('public_token', route.token)
    .eq('is_active', true)
    .single()

  if (error || !event) {
    const url = request.nextUrl.clone()
    url.pathname = '/not-found'
    return NextResponse.rewrite(url)
  }

  const eventPayload = {
    ...event,
    slideshow_interval_seconds: event.slideshow_interval_seconds ?? 5,
    slideshow_transition: event.slideshow_transition ?? 'cross_dissolve',
  }

  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = route.section === 'upload' ? '/upload' : '/'

  const response = NextResponse.rewrite(rewriteUrl)
  response.headers.set('x-event-id', event.id)
  response.headers.set('x-event-data', JSON.stringify(eventPayload))
  response.headers.set('x-event-token', route.token)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
