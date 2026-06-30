import Link from 'next/link'
import { APP_NAME } from '@/lib/theme'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--cream)]">
      <div className="text-center max-w-sm font-serif-display">
        <h1 className="font-script text-5xl text-[var(--text)] mb-4">{APP_NAME}</h1>
        <p className="text-[var(--text-muted)] text-lg mb-6">Evento não encontrado</p>
        <p className="text-[var(--text-muted)] text-sm mb-8">
          Não encontramos nenhum evento neste endereço. Verifique o link que você recebeu no convite.
        </p>
        <Link href="/" className="btn-gold inline-block py-3 px-8 rounded-2xl font-serif-display">
          Ir para o início
        </Link>
      </div>
    </main>
  )
}
