'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Admin, PlatformAdmin } from '@/types'
import { APP_NAME } from '@/lib/theme'
import { translateApiError } from '@/lib/api-errors'
import type { SubscriptionStatus } from '@/lib/admin-subscription'

const STATUSES: SubscriptionStatus[] = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'inactive',
]

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Ativo',
  trialing: 'Trial',
  past_due: 'Pagamento atrasado',
  canceled: 'Cancelado',
  inactive: 'Inativo',
}

type View = 'login' | 'dashboard'

interface SupplierRow extends Admin {
  saving?: boolean
}

export default function PlatformPanel() {
  const [view, setView] = useState<View>('login')
  const [platformAdmin, setPlatformAdmin] = useState<PlatformAdmin | null>(null)
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [newSupplier, setNewSupplier] = useState({
    email: '',
    password: '',
    company_name: '',
    subscription_status: 'inactive' as SubscriptionStatus,
  })
  const [createStatus, setCreateStatus] = useState<'idle' | 'saving' | 'done'>('idle')

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[var(--grid-line)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] font-serif-display bg-white text-sm'

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

  const loadSuppliers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/platform/suppliers')
      const data = await parseResponse(res)
      setSuppliers((data.suppliers as Admin[]) ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSession = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/platform/login')
      if (res.ok) {
        const data = await parseResponse(res)
        setPlatformAdmin(data.admin as PlatformAdmin)
        setView('dashboard')
        await loadSuppliers()
      }
    } catch {
      // not logged in
    } finally {
      setLoading(false)
    }
  }, [loadSuppliers])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/platform/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await parseResponse(res)
      setPlatformAdmin(data.admin as PlatformAdmin)
      setView('dashboard')
      await loadSuppliers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/platform/logout', { method: 'POST' })
    setPlatformAdmin(null)
    setSuppliers([])
    setView('login')
  }

  const updateSupplierField = (id: string, patch: Partial<SupplierRow>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const saveSupplier = async (supplier: SupplierRow) => {
    updateSupplierField(supplier.id, { saving: true })
    setError('')
    try {
      const res = await fetch(`/api/platform/suppliers?id=${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_status: supplier.subscription_status ?? 'inactive',
          subscription_expires_at: supplier.subscription_expires_at || null,
        }),
      })
      const data = await parseResponse(res)
      const updated = data.supplier as Admin
      setSuppliers((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...updated, saving: false } : s))
      )
    } catch (err: unknown) {
      updateSupplierField(supplier.id, { saving: false })
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateStatus('saving')
    setError('')
    try {
      const res = await fetch('/api/platform/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      })
      const data = await parseResponse(res)
      setSuppliers((prev) => [data.supplier as Admin, ...prev])
      setNewSupplier({
        email: '',
        password: '',
        company_name: '',
        subscription_status: 'inactive',
      })
      setCreateStatus('done')
      setTimeout(() => setCreateStatus('idle'), 2000)
    } catch (err: unknown) {
      setCreateStatus('idle')
      setError(err instanceof Error ? err.message : 'Erro ao criar fornecedor')
    }
  }

  const formatExpiresInput = (iso: string | null | undefined) => {
    if (!iso) return ''
    return iso.slice(0, 10)
  }

  if (loading && view === 'login' && !platformAdmin) {
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
            Administração da plataforma
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
            <button
              type="submit"
              className="btn-gold w-full py-3 rounded-xl font-serif-display font-semibold"
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <div className="bg-[var(--gold-dark)] px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-white font-serif-display font-semibold text-xl">Plataforma</h1>
          {platformAdmin && (
            <p className="text-white/70 text-sm font-serif-display">{platformAdmin.email}</p>
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

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {error && (
          <p className="text-red-500 text-sm font-serif-display bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <section className="bg-white rounded-2xl border border-[var(--grid-line)] p-6 shadow-sm">
          <h2 className="font-serif-display font-semibold text-lg text-[var(--text)] mb-4">
            Novo fornecedor
          </h2>
          <form
            onSubmit={handleCreateSupplier}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <input
              type="text"
              placeholder="Nome da empresa"
              required
              value={newSupplier.company_name}
              onChange={(e) => setNewSupplier({ ...newSupplier, company_name: e.target.value })}
              className={inputClass}
            />
            <input
              type="email"
              placeholder="E-mail"
              required
              value={newSupplier.email}
              onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Senha (mín. 8 caracteres)"
              required
              minLength={8}
              value={newSupplier.password}
              onChange={(e) => setNewSupplier({ ...newSupplier, password: e.target.value })}
              className={inputClass}
            />
            <select
              value={newSupplier.subscription_status}
              onChange={(e) =>
                setNewSupplier({
                  ...newSupplier,
                  subscription_status: e.target.value as SubscriptionStatus,
                })
              }
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 flex items-center gap-4">
              <button
                type="submit"
                disabled={createStatus === 'saving'}
                className="btn-gold px-6 py-2.5 rounded-xl font-serif-display font-semibold text-sm disabled:opacity-50"
              >
                {createStatus === 'saving' ? 'Criando…' : 'Adicionar fornecedor'}
              </button>
              {createStatus === 'done' && (
                <span className="text-green-600 text-sm font-serif-display">Criado!</span>
              )}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-[var(--grid-line)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--grid-line)]">
            <h2 className="font-serif-display font-semibold text-lg text-[var(--text)]">
              Fornecedores
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-serif-display">
              Eventos e fotos são excluídos automaticamente 30 dias após a data do evento.
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-[var(--text-muted)] font-serif-display text-sm">Carregando…</p>
          ) : suppliers.length === 0 ? (
            <p className="p-6 text-[var(--text-muted)] font-serif-display text-sm">
              Nenhum fornecedor cadastrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-serif-display">
                <thead>
                  <tr className="bg-[var(--cream)] text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Assinatura</th>
                    <th className="px-4 py-3">Válido até</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-t border-[var(--grid-line)]">
                      <td className="px-4 py-3 text-[var(--text)]">{supplier.company_name}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{supplier.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={supplier.subscription_status ?? 'inactive'}
                          onChange={(e) =>
                            updateSupplierField(supplier.id, {
                              subscription_status: e.target.value as SubscriptionStatus,
                            })
                          }
                          className={inputClass}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={formatExpiresInput(supplier.subscription_expires_at)}
                          onChange={(e) =>
                            updateSupplierField(supplier.id, {
                              subscription_expires_at: e.target.value
                                ? new Date(e.target.value + 'T23:59:59').toISOString()
                                : null,
                            })
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={supplier.saving}
                          onClick={() => saveSupplier(supplier)}
                          className="btn-gold px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                        >
                          {supplier.saving ? '…' : 'Salvar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
