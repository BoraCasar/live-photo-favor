import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  createSessionToken,
  getAdminFromSession,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/admin-auth'
import { isSubscriptionActive } from '@/lib/admin-subscription'
import { getServerClient, supabaseConnectionErrorMessage } from '@/lib/supabase-server'
import { apiError } from '@/lib/api-errors'
import type { Admin } from '@/types'

function adminResponse(admin: Admin) {
  return {
    admin: {
      id: admin.id,
      email: admin.email,
      company_name: admin.company_name,
      created_at: admin.created_at,
      subscription_status: admin.subscription_status,
      subscription_expires_at: admin.subscription_expires_at,
    },
    subscriptionActive: isSubscriptionActive(admin),
  }
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!email || !password) {
    return apiError('E-mail e senha são obrigatórios', 400)
  }

  try {
    const supabase = getServerClient()
    const { data: row, error } = await supabase
      .from('admins')
      .select(
        'id, email, company_name, password_hash, created_at, subscription_status, subscription_expires_at'
      )
      .eq('email', email)
      .single()

    if (error || !row || !verifyPassword(password, row.password_hash)) {
      return apiError('E-mail ou senha incorretos', 401)
    }

    const admin: Admin = {
      id: row.id,
      email: row.email,
      company_name: row.company_name,
      created_at: row.created_at,
      subscription_status: (row.subscription_status ?? 'inactive') as Admin['subscription_status'],
      subscription_expires_at: row.subscription_expires_at,
    }

    const token = createSessionToken(admin.id)
    const cookieStore = await cookies()
    cookieStore.set(sessionCookieOptions(token))

    return NextResponse.json(adminResponse(admin))
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}

export async function GET() {
  const admin = await getAdminFromSession()
  if (!admin) {
    return apiError('Unauthorized', 401)
  }
  return NextResponse.json(adminResponse(admin))
}
