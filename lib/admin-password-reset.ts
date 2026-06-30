import { createHash, randomBytes } from 'crypto'
import { hashPassword } from '@/lib/admin-auth'
import { getServerClient } from '@/lib/supabase-server'
import { getAppBaseUrl, sendEmail } from '@/lib/send-email'

const RESET_MS = 60 * 60 * 1000

export function createPasswordResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function requestPasswordReset(email: string, request: Request): Promise<void> {
  const supabase = getServerClient()
  const { data: admin } = await supabase
    .from('admins')
    .select('id, email')
    .eq('email', email)
    .single()

  if (!admin) return

  const { token, hash } = createPasswordResetToken()
  const expiresAt = new Date(Date.now() + RESET_MS).toISOString()

  await supabase
    .from('admins')
    .update({
      password_reset_token_hash: hash,
      password_reset_expires_at: expiresAt,
    })
    .eq('id', admin.id)

  const resetUrl = `${getAppBaseUrl(request)}/admin?reset=${encodeURIComponent(token)}`
  const sent = await sendEmail({
    to: admin.email,
    subject: 'Redefinir senha — Live Photo Favor',
    html: `
      <p>Recebemos um pedido para redefinir a senha da sua conta de administrador.</p>
      <p><a href="${resetUrl}">Clique aqui para definir uma nova senha</a></p>
      <p>Este link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.</p>
      <p style="color:#666;font-size:12px;">Ou copie e cole este endereço no navegador:<br>${resetUrl}</p>
    `,
  })

  if (!sent && process.env.NODE_ENV === 'development') {
    console.info('[password-reset] Dev reset link:', resetUrl)
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<'ok' | 'invalid' | 'expired'> {
  const tokenHash = hashPasswordResetToken(token)
  const supabase = getServerClient()

  const { data: admin } = await supabase
    .from('admins')
    .select('id, password_reset_expires_at')
    .eq('password_reset_token_hash', tokenHash)
    .single()

  if (!admin) return 'invalid'

  if (!admin.password_reset_expires_at || new Date(admin.password_reset_expires_at) < new Date()) {
    return 'expired'
  }

  const { error } = await supabase
    .from('admins')
    .update({
      password_hash: hashPassword(newPassword),
      password_reset_token_hash: null,
      password_reset_expires_at: null,
    })
    .eq('id', admin.id)

  if (error) return 'invalid'
  return 'ok'
}
