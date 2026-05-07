'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

type Celebrity = {
  id: number
  stage_name: string
  category: string | null
  verification_status: 'pending' | 'approved' | 'rejected'
  is_featured: boolean
  commission_rate: string
  rating_average: string
  rating_count: number
  total_orders: number
  completed_orders: number
  total_revenue: number | null
  user: {
    id: number
    email: string
    status: 'active' | 'suspended' | 'banned'
    created_at: string
  }
}

type CelebsResponse = {
  celebrities: { data: Celebrity[]; last_page: number; current_page: number }
}

const verificationClass: Record<string, string> = {
  approved:  'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending:   'border-amber/30 bg-amber/10 text-amber',
  rejected:  'border-red-400/30 bg-red-500/10 text-red-300',
}

const statusClass: Record<string, string> = {
  active:    'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  suspended: 'border-amber/30 bg-amber/10 text-amber',
  banned:    'border-red-400/30 bg-red-500/10 text-red-300',
}

/* ── Create Celebrity Modal ──────────────────────────────────────────────── */

function CreateCelebrityModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    email: '', password: '', stage_name: '', bio: '', category: '',
    commission_rate: '20', verification_status: 'pending', is_featured: false,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    try {
      await api.post('/admin/celebrities', {
        ...form,
        commission_rate: parseFloat(form.commission_rate),
        is_featured: form.is_featured,
      })
      onCreated()
      onClose()
    } catch (e) {
      setErr(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-[#071e29] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <p className="font-display font-bold text-white">Create Celebrity</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Stage Name *</label>
              <input required value={form.stage_name} onChange={e => set('stage_name', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Email *</label>
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Password *</label>
              <input required type="password" value={form.password} onChange={e => set('password', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Category</label>
              <input value={form.category} onChange={e => set('category', e.target.value)}
                placeholder="e.g. Music, Sports"
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Commission %</label>
              <input type="number" min="0" max="100" value={form.commission_rate} onChange={e => set('commission_rate', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Verification Status</label>
              <select value={form.verification_status} onChange={e => set('verification_status', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Bio</label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_featured" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)}
                className="h-4 w-4 accent-amber" />
              <label htmlFor="is_featured" className="text-sm text-slate-300">Featured celebrity</label>
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:border-white/20 hover:text-white">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-amber py-2.5 text-sm font-bold text-[#07161e] disabled:opacity-60">
              {saving ? 'Creating…' : 'Create Celebrity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function AdminCelebritiesPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [q, setQ] = useState('')
  const [filterVerification, setFilterVerification] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = async (search: string, verification: string, p: number) => {
    const params: Record<string, string | number> = { per_page: 20, page: p }
    if (search) params.q = search
    if (verification) params.verification_status = verification
    const res = await api.get<CelebsResponse>('/admin/celebrities', { params })
    setCelebrities(res.data.celebrities.data)
    setLastPage(res.data.celebrities.last_page)
  }

  useEffect(() => {
    const init = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        await load('', '', 1)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [router])

  const search = async () => {
    setPage(1)
    await load(q, filterVerification, 1)
  }

  const patchCeleb = async (celeb: Celebrity, patch: Partial<{ verification_status: string; is_featured: boolean; commission_rate: number }>) => {
    setActionId(celeb.id)
    setError('')
    try {
      await api.patch(`/admin/celebrities/${celeb.id}`, patch)
      await load(q, filterVerification, page)
      setMessage('Updated.')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const patchUserStatus = async (celeb: Celebrity, status: string) => {
    setActionId(celeb.id)
    setError('')
    try {
      await api.patch(`/admin/celebrities/${celeb.id}/user-status`, { status })
      await load(q, filterVerification, page)
      setMessage('User status updated.')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const promptCommission = (celeb: Celebrity) => {
    const val = window.prompt('Commission rate (0–100):', celeb.commission_rate)
    if (val === null) return
    const n = parseFloat(val)
    if (isNaN(n) || n < 0 || n > 100) { setError('Invalid commission rate.'); return }
    void patchCeleb(celeb, { commission_rate: n })
  }

  const deleteCeleb = async (celeb: Celebrity) => {
    if (!window.confirm(`Delete ${celeb.stage_name}? This also deletes their user account and cannot be undone.`)) return
    setActionId(celeb.id); setError('')
    try {
      await api.delete(`/admin/celebrities/${celeb.id}`)
      await load(q, filterVerification, page)
      setMessage('Celebrity deleted.')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {showCreate && (
        <CreateCelebrityModal
          onClose={() => setShowCreate(false)}
          onCreated={() => void load(q, filterVerification, page)}
        />
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold text-white">Celebrity Management</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{celebrities.length} shown</span>
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-xl bg-amber px-4 py-2 text-sm font-bold text-[#07161e] hover:opacity-90"
              >
                + Create Celebrity
              </button>
            </div>
          </div>

          {error   && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{message}</div>}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void search()}
              placeholder="Search name or email…"
              className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber/40 w-56"
            />
            <select
              value={filterVerification}
              onChange={(e) => { setFilterVerification(e.target.value); void load(q, e.target.value, 1) }}
              className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white"
            >
              <option value="">All verification</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => void search()}
              className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-[#07161e]"
            >
              Search
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Celebrity</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Verification</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Account</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Commission</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Orders</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Revenue</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Featured</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {celebrities.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No celebrities found.</td>
                  </tr>
                ) : celebrities.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{c.stage_name}</div>
                      <div className="text-xs text-slate-500">{c.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${verificationClass[c.verification_status] ?? ''}`}>
                        {c.verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[c.user.status] ?? ''}`}>
                        {c.user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.commission_rate}%</td>
                    <td className="px-4 py-3 text-slate-300">{c.completed_orders}/{c.total_orders}</td>
                    <td className="px-4 py-3 text-slate-300">${(c.total_revenue ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void patchCeleb(c, { is_featured: !c.is_featured })}
                        disabled={actionId === c.id}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${c.is_featured ? 'border-amber/30 bg-amber/10 text-amber' : 'border-white/10 text-slate-500 hover:border-amber/20 hover:text-amber'}`}
                      >
                        {c.is_featured ? '⭐ Featured' : 'Set featured'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {/* View/Edit — navigate to detail page */}
                        <button
                          onClick={() => router.push(`/admin/celebrities/${c.id}`)}
                          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:border-amber/30 hover:text-amber"
                        >
                          ✏️ Edit
                        </button>
                        {/* Verification actions */}
                        {c.verification_status !== 'approved' && (
                          <button
                            onClick={() => void patchCeleb(c, { verification_status: 'approved' })}
                            disabled={actionId === c.id}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {c.verification_status !== 'rejected' && (
                          <button
                            onClick={() => void patchCeleb(c, { verification_status: 'rejected' })}
                            disabled={actionId === c.id}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => promptCommission(c)}
                          disabled={actionId === c.id}
                          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-400 hover:border-amber/20 hover:text-amber disabled:opacity-50"
                        >
                          Commission
                        </button>
                        {/* User status actions */}
                        {c.user.status === 'active' ? (
                          <button
                            onClick={() => void patchUserStatus(c, 'suspended')}
                            disabled={actionId === c.id}
                            className="rounded-lg border border-amber/30 bg-amber/10 px-2 py-1 text-[11px] text-amber hover:bg-amber/20 disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => void patchUserStatus(c, 'active')}
                            disabled={actionId === c.id}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        {/* Delete */}
                        <button
                          onClick={() => void deleteCeleb(c)}
                          disabled={actionId === c.id}
                          className="rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/15 disabled:opacity-50"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const p = page - 1; setPage(p); void load(q, filterVerification, p) }}
                disabled={page === 1}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-500">Page {page} of {lastPage}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); void load(q, filterVerification, p) }}
                disabled={page === lastPage}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </DashShell>
  )
}


type Celebrity = {
  id: number
  stage_name: string
  category: string | null
  verification_status: 'pending' | 'approved' | 'rejected'
  is_featured: boolean
  commission_rate: string
  rating_average: string
  rating_count: number
  total_orders: number
  completed_orders: number
  total_revenue: number | null
  user: {
    id: number
    email: string
    status: 'active' | 'suspended' | 'banned'
    created_at: string
  }
}

type CelebsResponse = {
  celebrities: { data: Celebrity[]; last_page: number; current_page: number }
}

const verificationClass: Record<string, string> = {
  approved:  'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending:   'border-amber/30 bg-amber/10 text-amber',
  rejected:  'border-red-400/30 bg-red-500/10 text-red-300',
}

const statusClass: Record<string, string> = {
  active:    'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  suspended: 'border-amber/30 bg-amber/10 text-amber',
  banned:    'border-red-400/30 bg-red-500/10 text-red-300',
}

export default function AdminCelebritiesPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [q, setQ] = useState('')
  const [filterVerification, setFilterVerification] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async (search: string, verification: string, p: number) => {
    const params: Record<string, string | number> = { per_page: 20, page: p }
    if (search) params.q = search
    if (verification) params.verification_status = verification
    const res = await api.get<CelebsResponse>('/admin/celebrities', { params })
    setCelebrities(res.data.celebrities.data)
    setLastPage(res.data.celebrities.last_page)
  }

  useEffect(() => {
    const init = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        await load('', '', 1)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [router])

  const search = async () => {
    setPage(1)
    await load(q, filterVerification, 1)
  }

  const patchCeleb = async (celeb: Celebrity, patch: Partial<{ verification_status: string; is_featured: boolean; commission_rate: number }>) => {
    setActionId(celeb.id)
    setError('')
    try {
      await api.patch(`/admin/celebrities/${celeb.id}`, patch)
      await load(q, filterVerification, page)
      setMessage('Updated.')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const patchUserStatus = async (celeb: Celebrity, status: string) => {
    setActionId(celeb.id)
    setError('')
    try {
      await api.patch(`/admin/celebrities/${celeb.id}/user-status`, { status })
      await load(q, filterVerification, page)
      setMessage('User status updated.')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const promptCommission = (celeb: Celebrity) => {
    const val = window.prompt('Commission rate (0–100):', celeb.commission_rate)
    if (val === null) return
    const n = parseFloat(val)
    if (isNaN(n) || n < 0 || n > 100) { setError('Invalid commission rate.'); return }
    void patchCeleb(celeb, { commission_rate: n })
  }

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold text-white">Celebrity Management</h1>
            <span className="text-sm text-slate-500">{celebrities.length} shown</span>
          </div>

          {error   && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{message}</div>}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void search()}
              placeholder="Search name or email…"
              className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber/40 w-56"
            />
            <select
              value={filterVerification}
              onChange={(e) => { setFilterVerification(e.target.value); void load(q, e.target.value, 1) }}
              className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white"
            >
              <option value="">All verification</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => void search()}
              className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-[#07161e]"
            >
              Search
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Celebrity</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Verification</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Account</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Commission</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Orders</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Revenue</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Featured</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {celebrities.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No celebrities found.</td>
                  </tr>
                ) : celebrities.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{c.stage_name}</div>
                      <div className="text-xs text-slate-500">{c.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${verificationClass[c.verification_status] ?? ''}`}>
                        {c.verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[c.user.status] ?? ''}`}>
                        {c.user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.commission_rate}%</td>
                    <td className="px-4 py-3 text-slate-300">{c.completed_orders}/{c.total_orders}</td>
                    <td className="px-4 py-3 text-slate-300">${(c.total_revenue ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void patchCeleb(c, { is_featured: !c.is_featured })}
                        disabled={actionId === c.id}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${c.is_featured ? 'border-amber/30 bg-amber/10 text-amber' : 'border-white/10 text-slate-500 hover:border-amber/20 hover:text-amber'}`}
                      >
                        {c.is_featured ? '⭐ Featured' : 'Set featured'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {/* Verification actions */}
                        {c.verification_status !== 'approved' && (
                          <button
                            onClick={() => void patchCeleb(c, { verification_status: 'approved' })}
                            disabled={actionId === c.id}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {c.verification_status !== 'rejected' && (
                          <button
                            onClick={() => void patchCeleb(c, { verification_status: 'rejected' })}
                            disabled={actionId === c.id}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => promptCommission(c)}
                          disabled={actionId === c.id}
                          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-400 hover:border-amber/20 hover:text-amber disabled:opacity-50"
                        >
                          Commission
                        </button>
                        {/* User status actions */}
                        {c.user.status === 'active' ? (
                          <button
                            onClick={() => void patchUserStatus(c, 'suspended')}
                            disabled={actionId === c.id}
                            className="rounded-lg border border-amber/30 bg-amber/10 px-2 py-1 text-[11px] text-amber hover:bg-amber/20 disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => void patchUserStatus(c, 'active')}
                            disabled={actionId === c.id}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const p = page - 1; setPage(p); void load(q, filterVerification, p) }}
                disabled={page === 1}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-500">Page {page} of {lastPage}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); void load(q, filterVerification, p) }}
                disabled={page === lastPage}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </DashShell>
  )
}
