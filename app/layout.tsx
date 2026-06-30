import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Cormorant_Garamond, Great_Vibes } from 'next/font/google'
import './globals.css'
import type { Event } from '@/types'

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600'],
})

const script = Great_Vibes({
  subsets: ['latin'],
  variable: '--font-script',
  weight: '400',
})

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const eventData = headersList.get('x-event-data')
  const event: Event | null = eventData ? JSON.parse(eventData) : null

  if (event) {
    return {
      title: `${event.client_name} — Foto Lembrança Online`,
      description: event.welcome_message ?? `Compartilhe suas fotos de ${event.client_name}`,
    }
  }
  return {
    title: 'Foto Lembrança Online',
    description: 'Compartilhe suas fotos do casamento em tempo real.',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${serif.variable} ${script.variable} antialiased`}>{children}</body>
    </html>
  )
}
