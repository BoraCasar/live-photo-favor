import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  createPlatformSessionToken,
  getPlatformAdminFromSession,
  platformSessionCookieOptions,
  verifyPassword,
} from '@/lib/platform-auth'
import { getServerClient, supabaseConnectionErrorMessage } from '@/lib/supabase-server'
import { apiError } from '@/lib/api-errors'

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
    const { data: admin, error } = await supabase
      .from('platform_admins')
      .select('id, email, password_hash, created_at')
      .eq('email', email)
      .single()

    if (error || !admin || !verifyPassword(password, admin.password_hash)) {
      return apiError('E-mail ou senha incorretos', 401)
    }

    const token = createPlatformSessionToken(admin.id)
    const cookieStore = await cookies()
    cookieStore.set(platformSessionCookieOptions(token))

    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, created_at: admin.created_at },
    })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}

export async function GET() {
  const admin = await getPlatformAdminFromSession()
  if (!admin) return apiError('Unauthorized', 401)
  return NextResponse.json({ admin })
}
