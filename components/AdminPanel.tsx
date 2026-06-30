'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Admin, Event } from '@/types'
import { APP_NAME } from '@/lib/theme'
import { translateApiError } from '@/lib/api-errors'
import {
  parseSlideshowInterval,
  SLIDESHOW_MAX_SECONDS,
  SLIDESHOW_MIN_SECONDS,
  validateSlideshowIntervalInput,
} from '@/lib/slideshow-interval'
import {
  DEFAULT_SLIDESHOW_TRANSITION,
  SLIDESHOW_TRANSITION_LABELS,
  SLIDESHOW_TRANSITIONS,
  type SlideshowTransition,
} from '@/lib/slideshow-transition'
import { EVENT_DOMAIN } from '@/lib/event-domain'

const BILLING_CONTACT =
  process.env.NEXT_PUBLIC_BILLING_CONTACT?.trim() || 'contato@boracasar.net.br'

function BillingContact() {
  if (BILLING_CONTACT.startsWith('http')) {
    return (
      <a
        href={BILLING_CONTACT}
        className="text-[var(--gold-dark)] underline font-semibold"
        target="_blank"
        rel="noopener noreferrer"
      >
        Entrar em contato
      </a>
    )
  }
  if (BILLING_CONTACT.includes('@')) {
    return (
      <a href={`mailto:${BILLING_CONTACT}`} className="text-[var(--gold-dark)] underline font-semibold">
        {BILLING_CONTACT}
      </a>
    )
  }
  return <span className="font-semibold">{BILLING_CONTACT}</span>
}

function applySession(
  data: Record<string, unknown>,
  setAdmin: (a: Admin | null) => void,
  setView: (v: View) => void
): boolean {
  setAdmin(data.admin as Admin)
  if (data.subscriptionActive) {
    setView('dashboard')
    return true
  }
  setView('subscription-inactive')
  return false
}

type View = 'login' | 'forgot-password' | 'reset-password' | 'subscription-inactive' | 'dashboard'
type Tab = 'events' | 'new' | 'edit'

interface AdminPanelProps {
  resetToken?: string | null
}

export default function AdminPanel({ resetToken = null }: AdminPanelProps) {
  const [view, setView] = useState<View>('login')
  const [tab, setTab] = useState<Tab>('events')
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' })
  const [resetTokenValue, setResetTokenValue] = useState(resetToken ?? '')

  const [eventForm, setEventForm] = useState({
    subdomain: '',
    client_name: '',
    event_date: '',
    welcome_message: '',
    slideshow_interval_seconds: '5',
    slideshow_transition: DEFAULT_SLIDESHOW_TRANSITION as SlideshowTransition,
  })
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [formStatus, setFormStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [subdomainNotice, setSubdomainNotice] = useState('')

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  const parseResponse = async (res: Response) => {
    let data: Record<string, unknown> = {}
    try {
      data = await res.json()
    } catch {
      throw new Error('Resposta inválida do servidor')
    }
    if (!res.ok) throw new Error(translateApiError(String(data.error || 'Requisição falhou')))
    return data
  }

  const loadSession = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login')
      if (res.ok) {
        const data = await parseResponse(res)
        if (applySession(data, setAdmin, setView)) {
          await loadEvents()
        }
      }
    } catch {
      // not logged in
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/events')
      const data = await parseResponse(res)
      setEvents((data.events as Event[]) ?? [])
      setAdmin(data.admin as Admin)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSession()
  }, [])

  useEffect(() => {
    if (resetToken) {
      setResetTokenValue(resetToken)
      setView('reset-password')
    }
  }, [resetToken])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await parseResponse(res)
      if (applySession(data, setAdmin, setView)) {
        await loadEvents()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setForgotStatus('sending')
    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await parseResponse(res)
      setForgotStatus('sent')
      setError(String(data.message || 'Verifique seu e-mail.'))
    } catch (err: unknown) {
      setForgotStatus('idle')
      setError(err instanceof Error ? err.message : 'Erro ao solicitar redefinição')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (resetForm.password !== resetForm.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetTokenValue, password: resetForm.password }),
      })
      const data = await parseResponse(res)
      setResetForm({ password: '', confirmPassword: '' })
      setResetTokenValue('')
      setView('login')
      setError('')
      alert(String(data.message || 'Senha redefinida com sucesso. Faça login.'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAdmin(null)
    setEvents([])
    setView('login')
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const intervalErr = validateSlideshowIntervalInput(eventForm.slideshow_interval_seconds)
    if (intervalErr) {
      setFormStatus('error')
      setError(intervalErr)
      return
    }
    setFormStatus('saving')
    setError('')
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          welcome_message: eventForm.welcome_message || null,
          slideshow_interval_seconds: parseSlideshowInterval(eventForm.slideshow_interval_seconds),
          slideshow_transition: eventForm.slideshow_transition,
        }),
      })
      const data = await parseResponse(res)
      const created = data.event as Event

      if (data.subdomainAdjusted) {
        const requested = String(data.requestedSubdomain || eventForm.subdomain)
        const finalSubdomain = String(data.subdomain || created.subdomain)
        setSubdomainNotice(
          `O subdomínio "${requested}" já existia. Seu evento foi criado em ${finalSubdomain}.${EVENT_DOMAIN}.`
        )
      } else {
        setSubdomainNotice('')
      }

      if (logoFile) {
        const formData = new FormData()
        formData.append('file', logoFile)
        formData.append('eventId', created.id)
        await fetch('/api/admin/events', { method: 'PUT', body: formData })
      }

      setFormStatus('done')
      setEventForm({
        subdomain: '',
        client_name: '',
        event_date: '',
        welcome_message: '',
        slideshow_interval_seconds: '5',
        slideshow_transition: DEFAULT_SLIDESHOW_TRANSITION,
      })
      setLogoFile(null)
      await loadEvents()
      setTab('events')
      setTimeout(() => setFormStatus('idle'), 2000)
      setTimeout(() => setSubdomainNotice(''), 8000)
    } catch (err: unknown) {
      setFormStatus('error')
      setError(err instanceof Error ? err.message : 'Erro ao criar evento')
    }
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return
    const intervalErr = validateSlideshowIntervalInput(eventForm.slideshow_interval_seconds)
    if (intervalErr) {
      setFormStatus('error')
      setError(intervalErr)
      return
    }
    setFormStatus('saving')
    setError('')
    try {
      const res = await fetch(`/api/admin/events?id=${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: eventForm.client_name,
          event_date: eventForm.event_date,
          welcome_message: eventForm.welcome_message || null,
          slideshow_interval_seconds: parseSlideshowInterval(eventForm.slideshow_interval_seconds),
          slideshow_transition: eventForm.slideshow_transition,
        }),
      })
      await parseResponse(res)

      if (logoFile) {
        const formData = new FormData()
        formData.append('file', logoFile)
        formData.append('eventId', editingEvent.id)
        await fetch('/api/admin/events', { method: 'PUT', body: formData })
      }

      setFormStatus('done')
      setLogoFile(null)
      setEditingEvent(null)
      await loadEvents()
      setTab('events')
      setTimeout(() => setFormStatus('idle'), 2000)
    } catch (err: unknown) {
      setFormStatus('error')
      setError(err instanceof Error ? err.message : 'Erro ao atualizar evento')
    }
  }

  const startEdit = (ev: Event) => {
    setEditingEvent(ev)
    setEventForm({
      subdomain: ev.subdomain,
      client_name: ev.client_name,
      event_date: ev.event_date,
      welcome_message: ev.welcome_message ?? '',
      slideshow_interval_seconds: String(ev.slideshow_interval_seconds ?? 5),
      slideshow_transition: ev.slideshow_transition ?? DEFAULT_SLIDESHOW_TRANSITION,
    })
    setLogoFile(null)
    setTab('edit')
  }


  const handleSlideshowIntervalInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    if (input.validity.valueMissing) {
      input.setCustomValidity('Informe o intervalo em segundos.')
      return
    }
    if (input.validity.rangeUnderflow) {
      input.setCustomValidity(`O intervalo mínimo é ${SLIDESHOW_MIN_SECONDS} segundo.`)
      return
    }
    if (input.validity.rangeOverflow) {
      input.setCustomValidity(`O intervalo máximo é ${SLIDESHOW_MAX_SECONDS} segundos.`)
      return
    }
    const msg = validateSlideshowIntervalInput(input.value)
    input.setCustomValidity(msg ?? 'Valor inválido.')
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[var(--grid-line)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] font-serif-display bg-white'

  if (loading && view === 'login' && !admin) {
    return (
      <main className="min-h-screen bg-[var(--cream)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] font-serif-display">Carregando…</p>
      </main>
    )
  }

  if (view === 'login') {
    return (
      <main className="min-h-screen bg-[var(--cream)] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm border border-[var(--grid-line)]">
          <h1 className="font-script text-4xl text-[var(--text)] text-center mb-1">{APP_NAME}</h1>
          <p className="text-[var(--text-muted)] text-sm text-center mb-6 font-serif-display">
            Área do administrador
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="E-mail"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Senha"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className={inputClass}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full py-3 rounded-xl font-serif-display font-semibold">
              Entrar
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setView('forgot-password')
              setForgotEmail(loginForm.email)
              setForgotStatus('idle')
              setError('')
            }}
            className="w-full mt-4 text-sm text-[var(--gold-dark)] font-serif-display"
          >
            Esqueceu a senha?
          </button>
        </div>
      </main>
    )
  }

  if (view === 'forgot-password') {
    return (
      <main className="min-h-screen bg-[var(--cream)] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm border border-[var(--grid-line)]">
          <h1 className="font-serif-display text-2xl font-semibold text-[var(--text)] mb-1">
            Redefinir senha
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-6 font-serif-display">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
          {forgotStatus === 'sent' ? (
            <p className="text-green-700 text-sm font-serif-display mb-6">{error}</p>
          ) : (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="E-mail"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className={inputClass}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={forgotStatus === 'sending'}
                className="btn-gold w-full py-3 rounded-xl font-serif-display font-semibold disabled:opacity-50"
              >
                {forgotStatus === 'sending' ? 'Enviando…' : 'Enviar link'}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => {
              setView('login')
              setForgotStatus('idle')
              setError('')
            }}
            className="w-full mt-4 text-sm text-[var(--gold-dark)] font-serif-display"
          >
            ← Voltar ao login
          </button>
        </div>
      </main>
    )
  }

  if (view === 'reset-password') {
    return (
      <main className="min-h-screen bg-[var(--cream)] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm border border-[var(--grid-line)]">
          <h1 className="font-serif-display text-2xl font-semibold text-[var(--text)] mb-1">
            Nova senha
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-6 font-serif-display">
            Escolha uma nova senha para sua conta.
          </p>
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Nova senha (mín. 8 caracteres)"
              required
              minLength={8}
              value={resetForm.password}
              onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Confirmar nova senha"
              required
              minLength={8}
              value={resetForm.confirmPassword}
              onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
              className={inputClass}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full py-3 rounded-xl font-serif-display font-semibold">
              Salvar nova senha
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setView('login')
              setError('')
            }}
            className="w-full mt-4 text-sm text-[var(--gold-dark)] font-serif-display"
          >
            ← Voltar ao login
          </button>
        </div>
      </main>
    )
  }

  if (view === 'subscription-inactive') {
    return (
      <main className="min-h-screen bg-[var(--cream)] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md border border-[var(--grid-line)] text-center">
          <h1 className="font-serif-display text-2xl font-semibold text-[var(--text)] mb-2">
            Assinatura inativa
          </h1>
          {admin && (
            <p className="text-[var(--text-muted)] text-sm mb-4 font-serif-display">
              {admin.company_name} · {admin.email}
            </p>
          )}
          <p className="text-[var(--text)] text-sm mb-6 font-serif-display leading-relaxed">
            O painel administrativo requer um plano mensal ativo. As páginas dos seus eventos
            continuam online para os convidados.
          </p>
          <p className="text-[var(--text-muted)] text-sm mb-8 font-serif-display">
            Para ativar ou renovar: <BillingContact />
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-gold w-full py-3 rounded-xl font-serif-display font-semibold"
          >
            Sair
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <div className="bg-[var(--gold-dark)] px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-white font-serif-display font-semibold text-xl">Painel Admin</h1>
          {admin && (
            <p className="text-white/70 text-sm font-serif-display">{admin.company_name}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-white/80 text-sm font-serif-display hover:text-white"
        >
          Sair
        </button>
      </div>

      {admin?.subscription_expires_at && (
        <div className="bg-green-50 border-b border-green-100 px-6 py-2 text-center">
          <p className="text-green-800 text-xs font-serif-display">
            Plano ativo até{' '}
            {new Date(admin.subscription_expires_at).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      )}

      <div className="flex border-b border-[var(--grid-line)] bg-white">
        {(
          [
            ['events', 'Meus Eventos'],
            ['new', '+ Novo Evento'],
            ...(tab === 'edit' ? [['edit', 'Editar']] : []),
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === 'new') {
                setEditingEvent(null)
                setEventForm({
        subdomain: '',
        client_name: '',
        event_date: '',
        welcome_message: '',
        slideshow_interval_seconds: '5',
        slideshow_transition: DEFAULT_SLIDESHOW_TRANSITION,
      })
                setLogoFile(null)
              }
              setTab(key as Tab)
            }}
            className={`flex-1 py-4 font-serif-display text-sm transition ${
              tab === key
                ? 'text-[var(--gold-dark)] border-b-2 border-[var(--gold-dark)] font-semibold'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {subdomainNotice && tab === 'events' && (
          <p className="text-green-700 text-sm mb-4 font-serif-display bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            {subdomainNotice}
          </p>
        )}
        {error && tab === 'events' && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {tab === 'events' && (
          <div>
            {loading ? (
              <p className="text-center py-16 text-[var(--text-muted)] font-serif-display">Carregando…</p>
            ) : events.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)] font-serif-display">
                <p className="mb-2">Nenhum evento ainda.</p>
                <p className="text-sm">Crie o primeiro evento da sua empresa.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => startEdit(ev)}
                    className="bg-white rounded-2xl shadow-sm border border-[var(--grid-line)] p-5 flex items-center gap-4 text-left w-full hover:border-[var(--gold-light)] transition"
                  >
                    {ev.logo_url ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[var(--cream)]">
                        <Image src={ev.logo_url} alt="" fill className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[var(--gold-light)]/40 flex items-center justify-center flex-shrink-0 font-script text-[var(--gold-dark)]">
                        FL
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-serif-display font-semibold text-[var(--text)] truncate">
                        {ev.client_name}
                      </p>
                      <p className="text-[var(--text-muted)] text-sm truncate">
                        {ev.subdomain}.{EVENT_DOMAIN} ·{' '}
                        {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                        ev.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {ev.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(tab === 'new' || tab === 'edit') && (
          <form
            onSubmit={tab === 'new' ? handleCreateEvent : handleUpdateEvent}
            className="flex flex-col gap-4 bg-white rounded-2xl shadow-sm border border-[var(--grid-line)] p-6"
          >
            <h2 className="font-serif-display font-semibold text-lg text-[var(--text)]">
              {tab === 'new' ? 'Criar Novo Evento' : 'Editar Evento'}
            </h2>

            {tab === 'new' && (
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                  Subdomínio *
                </label>
                <input
                  required
                  placeholder="ex: casamentojoaoana"
                  value={eventForm.subdomain}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    })
                  }
                  className={inputClass}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1 font-serif-display">
                  {eventForm.subdomain || 'subdominio'}.{EVENT_DOMAIN}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                Nome do Evento *
              </label>
              <input
                required
                placeholder="ex: Casamento Ana & João"
                value={eventForm.client_name}
                onChange={(e) => setEventForm({ ...eventForm, client_name: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                Data do Evento *
              </label>
              <input
                required
                type="date"
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                Logo do Evento
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-2 font-serif-display">
                Aparece no cabeçalho do evento.
              </p>
              {(logoPreviewUrl || (editingEvent?.logo_url && !logoFile)) && (
                <div className="w-28 h-28 mb-3 bg-[var(--cream)] rounded-lg overflow-hidden border border-[var(--grid-line)] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreviewUrl ?? editingEvent?.logo_url ?? ''}
                    alt="Pré-visualização do logo"
                    className="max-w-full max-h-full object-contain p-1"
                  />
                </div>
              )}
              <label className="inline-flex items-center justify-center px-5 py-3 rounded-xl btn-gold font-serif-display font-semibold text-sm cursor-pointer transition-transform active:scale-95">
                Escolher arquivo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              {logoFile && (
                <p className="text-sm text-[var(--text-muted)] mt-2 font-serif-display truncate">
                  {logoFile.name}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                Apresentação — segundos por foto
              </label>
              <input
                type="number"
                min={SLIDESHOW_MIN_SECONDS}
                max={SLIDESHOW_MAX_SECONDS}
                step="any"
                required
                value={eventForm.slideshow_interval_seconds}
                onChange={(e) => {
                  e.target.setCustomValidity('')
                  setEventForm({ ...eventForm, slideshow_interval_seconds: e.target.value })
                }}
                onInvalid={handleSlideshowIntervalInvalid}
                className={inputClass}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1 font-serif-display">
                Intervalo do slideshow &quot;Apresentação&quot; no menu (1–120 segundos; decimais permitidos, ex.: 1,5).
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                Apresentação — transição entre fotos
              </label>
              <select
                value={eventForm.slideshow_transition}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    slideshow_transition: e.target.value as SlideshowTransition,
                  })
                }
                className={inputClass}
              >
                {SLIDESHOW_TRANSITIONS.map((key) => (
                  <option key={key} value={key}>
                    {SLIDESHOW_TRANSITION_LABELS[key]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-serif-display">
                Dissolução cruzada é o padrão — as fotos se sobrepõem suavemente.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 block">
                Mensagem de Boas-vindas (opcional)
              </label>
              <textarea
                placeholder="ex: Obrigado por celebrar conosco!"
                value={eventForm.welcome_message}
                onChange={(e) => setEventForm({ ...eventForm, welcome_message: e.target.value })}
                rows={3}
                maxLength={300}
                className={`${inputClass} resize-none`}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {formStatus === 'done' && (
              <p className="text-green-600 font-semibold text-center font-serif-display">Salvo! 🎉</p>
            )}

            <button
              type="submit"
              disabled={formStatus === 'saving'}
              className="btn-gold w-full py-4 rounded-2xl font-serif-display font-semibold text-lg disabled:opacity-50"
            >
              {formStatus === 'saving' ? 'Salvando…' : tab === 'new' ? 'Criar Evento' : 'Salvar Alterações'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
