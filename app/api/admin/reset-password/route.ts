import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-errors'
import { resetPasswordWithToken } from '@/lib/admin-password-reset'
import { supabaseConnectionErrorMessage } from '@/lib/supabase-server'

export async function POST(request: Request) {
  let body: { token?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON', 400)
  }

  const token = body.token?.trim()
  const password = body.password

  if (!token || !password) {
    return apiError('Token e nova senha são obrigatórios', 400)
  }

  if (password.length < 8) {
    return apiError('A senha deve ter pelo menos 8 caracteres', 400)
  }

  try {
    const result = await resetPasswordWithToken(token, password)

    if (result === 'expired') {
      return apiError('Este link expirou. Solicite uma nova redefinição de senha.', 400)
    }
    if (result === 'invalid') {
      return apiError('Link de redefinição inválido ou já utilizado.', 400)
    }

    return NextResponse.json({ ok: true, message: 'Senha redefinida com sucesso.' })
  } catch (err) {
    return apiError(supabaseConnectionErrorMessage(err), 500)
  }
}
