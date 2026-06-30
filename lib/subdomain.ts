import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Subdomains reserved for infrastructure — not usable as event slugs. */
export const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'api', 'foto-lembranca', ''])

const MAX_SUFFIX_ATTEMPTS = 100

export function normalizeSubdomain(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
}

export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.has(subdomain)
}

export class SubdomainValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubdomainValidationError'
  }
}

export function isSubdomainDuplicateError(error: { message?: string } | null): boolean {
  const msg = error?.message?.toLowerCase() ?? ''
  return msg.includes('duplicate key') && msg.includes('subdomain')
}

export async function allocateUniqueSubdomain(
  supabase: SupabaseClient<Database>,
  rawSubdomain: string
): Promise<{ subdomain: string; adjusted: boolean; requestedSubdomain: string }> {
  const requestedSubdomain = normalizeSubdomain(rawSubdomain)

  if (!requestedSubdomain) {
    throw new SubdomainValidationError('Subdomínio inválido.')
  }
  if (isReservedSubdomain(requestedSubdomain)) {
    throw new SubdomainValidationError('Este subdomínio é reservado e não pode ser usado.')
  }

  const { data: existing, error } = await supabase
    .from('events')
    .select('subdomain')
    .or(`subdomain.eq.${requestedSubdomain},subdomain.like.${requestedSubdomain}-%`)

  if (error) {
    throw new Error(error.message ?? 'Erro ao verificar subdomínio')
  }

  const taken = new Set((existing ?? []).map((row) => row.subdomain))

  if (!taken.has(requestedSubdomain)) {
    return { subdomain: requestedSubdomain, adjusted: false, requestedSubdomain }
  }

  for (let n = 2; n <= MAX_SUFFIX_ATTEMPTS + 1; n++) {
    const candidate = `${requestedSubdomain}-${n}`
    if (!taken.has(candidate) && !isReservedSubdomain(candidate)) {
      return { subdomain: candidate, adjusted: true, requestedSubdomain }
    }
  }

  throw new SubdomainValidationError(
    'Não foi possível encontrar um subdomínio disponível. Tente outro nome.'
  )
}
