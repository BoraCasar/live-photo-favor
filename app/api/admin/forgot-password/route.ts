import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-errors'
import { requestPasswordReset } from '@/lib/admin-password-reset'
import { supabaseConnectionErrorMessage } from '@/lib/supabase-server'

const SUCCESS_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha em alguns minutos.'

export async function POST(request: Request) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return apiError('E-mail é obrigatório', 400)
  }

  try {
    await requestPasswordReset(email, request)
    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}
