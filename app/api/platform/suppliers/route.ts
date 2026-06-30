import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/admin-auth'
import { getPlatformAdminFromSession } from '@/lib/platform-auth'
import type { SubscriptionStatus } from '@/lib/admin-subscription'
import { getServerClient, supabaseConnectionErrorMessage } from '@/lib/supabase-server'
import { apiError } from '@/lib/api-errors'

const VALID_STATUSES: SubscriptionStatus[] = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'inactive',
]

function parseStatus(value: unknown): SubscriptionStatus | null {
  if (typeof value !== 'string') return null
  return VALID_STATUSES.includes(value as SubscriptionStatus) ? (value as SubscriptionStatus) : null
}

export async function GET() {
  const platformAdmin = await getPlatformAdminFromSession()
  if (!platformAdmin) return apiError('Unauthorized', 401)

  const supabase = getServerClient()
  const { data, error } = await supabase
    .from('admins')
    .select(
      'id, email, company_name, created_at, subscription_status, subscription_expires_at'
    )
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 500)
  return NextResponse.json({ suppliers: data ?? [] })
}

export async function POST(request: Request) {
  const platformAdmin = await getPlatformAdminFromSession()
  if (!platformAdmin) return apiError('Unauthorized', 401)

  let body: {
    email?: string
    password?: string
    company_name?: string
    subscription_status?: string
  }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const companyName = body.company_name?.trim()
  const status = parseStatus(body.subscription_status) ?? 'inactive'

  if (!email || !password || !companyName) {
    return apiError('E-mail, senha e nome da empresa são obrigatórios', 400)
  }
  if (password.length < 8) {
    return apiError('A senha deve ter pelo menos 8 caracteres', 400)
  }

  const expiresAt =
    status === 'active' || status === 'trialing'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null

  try {
    const supabase = getServerClient()
    const { data, error } = await supabase
      .from('admins')
      .insert({
        email,
        password_hash: hashPassword(password),
        company_name: companyName,
        subscription_status: status,
        subscription_expires_at: expiresAt,
      })
      .select(
        'id, email, company_name, created_at, subscription_status, subscription_expires_at'
      )
      .single()

    if (error) {
      if (error.code === '23505') return apiError('Este e-mail já está cadastrado', 409)
      return apiError(error.message, 500)
    }

    return NextResponse.json({ supplier: data }, { status: 201 })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}

export async function PATCH(request: Request) {
  const platformAdmin = await getPlatformAdminFromSession()
  if (!platformAdmin) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return apiError('id required', 400)

  let body: { subscription_status?: string; subscription_expires_at?: string | null }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const status = parseStatus(body.subscription_status)
  if (!status) return apiError('Status de assinatura inválido', 400)

  let expiresAt: string | null = null
  if (body.subscription_expires_at !== undefined) {
    expiresAt = body.subscription_expires_at ? String(body.subscription_expires_at) : null
  } else if (status === 'active' || status === 'trialing') {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  try {
    const supabase = getServerClient()
    const { data, error } = await supabase
      .from('admins')
      .update({
        subscription_status: status,
        subscription_expires_at: expiresAt,
      })
      .eq('id', id)
      .select(
        'id, email, company_name, created_at, subscription_status, subscription_expires_at'
      )
      .single()

    if (error) return apiError(error.message, 500)
    return NextResponse.json({ supplier: data })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}
