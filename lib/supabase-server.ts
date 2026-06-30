import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { translateApiError } from '@/lib/api-errors'

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !serviceKey) {
    throw new Error(
      'Variáveis de ambiente do Supabase ausentes. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local e reinicie o servidor.'
    )
  }

  if (url.includes('REPLACE_WITH') || url.includes('YOUR_PROJECT_REF')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ainda é um placeholder. Defina a URL real do seu projeto Supabase no .env.local e reinicie o npm run dev.'
    )
  }

  return { url, serviceKey }
}

export function getServerClient() {
  const { url, serviceKey } = getSupabaseConfig()
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false } })
}

export function supabaseConnectionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('fetch failed') || message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
    return 'Não foi possível conectar ao Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL no .env.local e reinicie o servidor.'
  }
  return translateApiError(message)
}
