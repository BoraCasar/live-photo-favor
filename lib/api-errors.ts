import { NextResponse } from 'next/server'

const EXACT: Record<string, string> = {
  Unauthorized: 'Não autorizado.',
  'Invalid JSON': 'JSON inválido.',
  'Invalid form data': 'Dados de envio inválidos.',
  'id required': 'O id é obrigatório.',
  'eventId required': 'O eventId é obrigatório.',
  'approved (boolean) required': 'O campo approved (booleano) é obrigatório.',
  'subdomain, client_name, and event_date are required':
    'Link do evento, nome do evento e data são obrigatórios.',
  'Nada para atualizar': 'Nada para atualizar.',
  'E-mail é obrigatório': 'E-mail é obrigatório.',
  'Token e nova senha são obrigatórios': 'Token e nova senha são obrigatórios.',
  'Este link expirou. Solicite uma nova redefinição de senha.':
    'Este link expirou. Solicite uma nova redefinição de senha.',
  'Link de redefinição inválido ou já utilizado.':
    'Link de redefinição inválido ou já utilizado.',
  'Assinatura inativa. Entre em contato para ativar seu plano mensal.':
    'Assinatura inativa. Entre em contato para ativar seu plano mensal.',
  'Status de assinatura inválido': 'Status de assinatura inválido.',
  'Subdomínio inválido.': 'Identificador inválido.',
  'Este subdomínio é reservado e não pode ser usado.':
    'Este identificador é reservado e não pode ser usado.',
  'Não foi possível encontrar um subdomínio disponível. Tente outro nome.':
    'Não foi possível encontrar um identificador disponível. Tente outro nome.',
}

export function translateApiError(message: string): string {
  if (!message) return 'Ocorreu um erro. Tente novamente.'

  const trimmed = message.trim()
  if (EXACT[trimmed]) return EXACT[trimmed]

  const lower = trimmed.toLowerCase()

  if (lower.includes('unauthorized')) return 'Não autorizado.'
  if (lower.includes('invalid json')) return 'JSON inválido.'
  if (lower.includes('duplicate key') && lower.includes('subdomain')) {
    return 'Este identificador já está em uso.'
  }
  if (lower.includes('duplicate key') && lower.includes('email')) {
    return 'Este e-mail já está cadastrado.'
  }
  if (lower.includes('slideshow_interval_seconds') && lower.includes('check')) {
    return 'O intervalo da apresentação deve ser entre 1 e 120 segundos.'
  }
  if (lower.includes('value must be greater than or equal to')) {
    return 'O intervalo da apresentação deve ser de pelo menos 1 segundo.'
  }
  if (lower.includes('value must be less than or equal to')) {
    return 'O intervalo da apresentação deve ser de no máximo 120 segundos.'
  }
  if (lower.includes('could not find') && lower.includes('slideshow_interval_seconds')) {
    return 'Execute a migração do banco de dados (migration-slideshow.sql) no Supabase.'
  }
  if (lower.includes('could not find') && lower.includes('slideshow_transition')) {
    return 'Execute a migração do banco de dados (migration-slideshow-transition.sql) no Supabase.'
  }
  if (lower.includes('slideshow_transition') && lower.includes('check')) {
    return 'Transição de apresentação inválida.'
  }
  if (lower.includes('fetch failed') || lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }
  if (trimmed === 'Failed to fetch') {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }

  return trimmed
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: translateApiError(message) }, { status })
}
