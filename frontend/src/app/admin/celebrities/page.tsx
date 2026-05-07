'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

/* -- Types ----------------------------------------------------------------- */

type Celebrity = {
  id: number
  stage_name: string
  category: string | null
  verification_status: 'pending' | 'verified' | 'rejected'
  is_featured: boolean
  commission_rate: string
  sort_order: number
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

type PagedResponse = {
  celebrities: {
    data: Celebrity[]
    last_page: number
    current_page: number
    total: number
  }
}

/* -- Badge helpers --------------------------------------------------------- */

const verificationClass: Record<string, string> = {
  verified: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending:  'border-amber/30 bg-amber/10 text-amber',
  rejected: 'border-red-400/30 bg-red-500/10 text-red-300',
}

const statusClass: Record<string, string> = {
  active:    'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  suspended: 'border-amber/30 bg-amber/10 text-amber',
  banned:    'border-red-400/30 bg-red-500/10 text-red-300',
}

/* -- Toggle ---------------------------------------------------------------- */

function Toggle({ on, onChange, title }: { on: boolean; onChange: () => void; title?: string }) {
  return (
    <button onClick={onChange} title={title}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full border transition ${on ? 'border-amber/40 bg-amber/20' : 'border-white/10 bg-white/[0.05]'}`}
    >
      <span className={`ml-0.5 h-4 w-4 rounded-full transition-transform ${on ? 'translate-x-5 bg-amber' : 'translate-x-0 bg-slate-600'}`} />
    </button>
  )
}

/* -- Inline commission editor ---------------------------------------------- */

function CommissionCell({ value, onSave }: { value: string; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  const submit = () => {
    const n = parseFloat(draft)
    if (!isNaN(n) && n >= 0 && n <= 100) { onSave(n); setEditing(false) }
  }
  if (editing) return (
    <div className="flex items-center gap-1">
      <input ref={inputRef} type="number" min={0} max={100} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-16 rounded-lg border border-amber/40 bg-[#071e29] px-1.5 py-0.5 text-xs text-white focus:outline-none" />
      <span className="text-xs text-slate-500">%</span>
      <button onClick={submit} className="rounded px-1 text-[10px] text-emerald-400">OK</button>
      <button onClick={() => setEditing(false)} className="rounded px-1 text-[10px] text-slate-500">x</button>
    </div>
  )
  return (
    <button onClick={() => { setDraft(value); setEditing(true) }}
      className="group flex items-center gap-1 rounded px-1 hover:bg-amber/10" title="Click to edit">
      <span className="text-slate-300">{value}%</span>
      <span className="text-[10px] text-slate-600 opacity-0 transition group-hover:opacity-100">pen</span>
    </button>
  )
}

/* -- Create Modal ---------------------------------------------------------- */

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email: '', password: '', stage_name: '', bio: '', category: '', commission_rate: '20', verification_status: 'pending', is_featured: false })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await api.post('/admin/celebrities', { ...form, commission_rate: parseFloat(form.commission_rate) })
      onCreated(); onClose()
    } catch (ex) { setErr(getApiErrorMessage(ex)) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-[#071e29] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <p className="font-display font-bold text-white">Create Celebrity</p>
          <button onClick={onClose} className="text-xl text-slate-500 hover:text-white">X</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Stage Name *</label>
              <input required value={form.stage_name} onChange={(e) => set('stage_name', e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Password *</label>
              <input required type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Category</label>
              <input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Music, Sports" className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Commission %</label>
              <input type="number" min="0" max="100" value={form.commission_rate} onChange={(e) => set('commission_rate', e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Verification Status</label>
              <select value={form.verification_status} onChange={(e) => set('verification_status', e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40">
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Bio</label>
              <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_featured" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} className="h-4 w-4 accent-amber" />
              <label htmlFor="is_featured" className="text-sm text-slate-300">Featured celebrity</label>
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:border-white/20 hover:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-amber py-2.5 text-sm font-bold text-[#07161e] disabled:opacity-60">{saving ? 'Creating...' : 'Create Celebrity'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* -- Main page ------------------------------------------------------------- */

export default function AdminCelebritiesPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tab, setTab] = useState<'all' | 'arrangement'>('all')
  const [showCreate, setShowCreate] = useState(false)

  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [filterVerification, setFilterVerification] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [arranged, setArranged] = useState<Celebrity[]>([])
  const [arrangementLoading, setArrangementLoading] = useState(false)
  const [arrangementDirty, setArrangementDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const loadPage = useCallback(async (search: string, verification: string, p: number) => {
    const params: Record<string, string | number> = { per_page: 20, page: p }
    if (search) params.q = search
    if (verification) params.verification_status = verification
    const res = await api.get<PagedResponse>('/admin/celebrities', { params })
    setCelebrities(res.data.celebrities.data)
    setLastPage(res.data.celebrities.last_page)
    setTotal(res.data.celebrities.total ?? res.data.celebrities.data.length)
  }, [])

  const loadArrangement = useCallback(async () => {
    setArrangementLoading(true)
    try {
      const res = await api.get<PagedResponse>('/admin/celebrities', { params: { per_page: 200, page: 1 } })
      const sorted = [...res.data.celebrities.data].sort((a, b) =>
        a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.id - b.id
      )
      setArranged(sorted)
      setArrangementDirty(false)
    } finally { setArrangementLoading(false) }
  }, [])

  useEffect(() => {
    const init = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        await Promise.all([loadPage('', '', 1), loadArrangement()])
      } catch (e) { setError(getApiErrorMessage(e)) }
      finally { setLoading(false) }
    }
    void init()
  }, [router, loadPage, loadArrangement])

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  const patchCeleb = async (
    celeb: Celebrity,
    patch: Partial<{ verification_status: Celebrity['verification_status']; is_featured: boolean; commission_rate: number }>
  ) => {
    setActionId(celeb.id); setError('')
    try {
      await api.patch(`/admin/celebrities/${celeb.id}`, patch)
      await loadPage(q, filterVerification, page)
      setArranged((prev) => prev.map((c) => {
        if (c.id !== celeb.id) return c
        return {
          ...c,
          ...patch,
          verification_status: patch.verification_status ?? c.verification_status,
          commission_rate: patch.commission_rate !== undefined ? String(patch.commission_rate) : c.commission_rate,
        }
      }))
      flash('Updated.')
    } catch (e) { setError(getApiErrorMessage(e)) }
    finally { setActionId(null) }
  }

  const patchUserStatus = async (celeb: Celebrity, status: string) => {
    setActionId(celeb.id); setError('')
    try {
      await api.patch(`/admin/celebrities/${celeb.id}/user-status`, { status })
      await loadPage(q, filterVerification, page)
      flash('User status updated.')
    } catch (e) { setError(getApiErrorMessage(e)) }
    finally { setActionId(null) }
  }

  const toggleFeatured = async (celeb: Celebrity) => {
    const newVal = !celeb.is_featured
    setArranged((prev) => prev.map((c) => (c.id === celeb.id ? { ...c, is_featured: newVal } : c)))
    setCelebrities((prev) => prev.map((c) => (c.id === celeb.id ? { ...c, is_featured: newVal } : c)))
    try {
      await api.patch(`/admin/celebrities/${celeb.id}`, { is_featured: newVal })
    } catch (e) {
      setArranged((prev) => prev.map((c) => (c.id === celeb.id ? { ...c, is_featured: celeb.is_featured } : c)))
      setCelebrities((prev) => prev.map((c) => (c.id === celeb.id ? { ...c, is_featured: celeb.is_featured } : c)))
      setError(getApiErrorMessage(e))
    }
  }

  const onDragStart = (idx: number) => setDragIdx(idx)
  const onDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); if (idx !== overIdx) setOverIdx(idx) }
  const onDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return }
    const next = [...arranged]
    const [item] = next.splice(dragIdx, 1)
    next.splice(idx, 0, item)
    setArranged(next)
    setArrangementDirty(true)
    setDragIdx(null); setOverIdx(null)
  }

  const saveOrder = async () => {
    setSavingOrder(true)
    try {
      const order = arranged.map((c, i) => ({ id: c.id, sort_order: i + 1 }))
      await api.post('/admin/celebrities/reorder', { order })
      setArrangementDirty(false)
      flash('Display order saved.')
    } catch (e) { setError(getApiErrorMessage(e)) }
    finally { setSavingOrder(false) }
  }

  const featuredCount = arranged.filter((c) => c.is_featured).length
  const verifiedCount = arranged.filter((c) => c.verification_status === 'verified').length
  const pendingCount  = arranged.filter((c) => c.verification_status === 'pending').length

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { void loadPage(q, filterVerification, page); void loadArrangement() }}
        />
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-5">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Celebrity Management</h1>
              <p className="mt-0.5 text-sm text-slate-500">Manage profiles, verification, commissions and display order</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="rounded-xl bg-amber px-4 py-2 text-sm font-bold text-[#07161e] hover:opacity-90">
              + Create Celebrity
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total',          value: total || arranged.length, color: 'text-white' },
              { label: 'Verified',       value: verifiedCount,            color: 'text-emerald-400' },
              { label: 'Pending review', value: pendingCount,             color: 'text-amber' },
              { label: 'Featured',       value: featuredCount,            color: 'text-amber' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.07] bg-[#071e29]/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
                <p className={`mt-1 font-display text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {error   && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{message}</div>}

          <div className="flex gap-1 border-b border-white/[0.07]">
            {([
              { key: 'all' as const,         label: 'All Celebrities' },
              { key: 'arrangement' as const, label: 'Featured and Order' },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-semibold transition ${tab === key ? 'border-b-2 border-amber text-amber' : 'text-slate-500 hover:text-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'all' && (
            <>
              <div className="flex flex-wrap gap-2">
                <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); void loadPage(q, filterVerification, 1) } }}
                  placeholder="Search name or email..."
                  className="w-56 rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber/40" />
                <select value={filterVerification}
                  onChange={(e) => { setFilterVerification(e.target.value); setPage(1); void loadPage(q, e.target.value, 1) }}
                  className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white">
                  <option value="">All verification</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => { setPage(1); void loadPage(q, filterVerification, 1) }}
                  className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-[#07161e]">
                  Search
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-left">
                      {['Celebrity', 'Category', 'Verification', 'Account', 'Commission', 'Orders', 'Revenue', 'Featured', 'Actions'].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {celebrities.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No celebrities found.</td></tr>
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
                        <td className="px-4 py-3">
                          <CommissionCell value={c.commission_rate} onSave={(n) => void patchCeleb(c, { commission_rate: n })} />
                        </td>
                        <td className="px-4 py-3 text-slate-300">{c.completed_orders}/{c.total_orders}</td>
                        <td className="px-4 py-3 text-slate-300">${(c.total_revenue ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Toggle on={c.is_featured} onChange={() => void toggleFeatured(c)} title={c.is_featured ? 'Remove from featured' : 'Set as featured'} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.verification_status !== 'verified' && (
                              <button onClick={() => void patchCeleb(c, { verification_status: 'verified' })} disabled={actionId === c.id}
                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">
                                Verify
                              </button>
                            )}
                            {c.verification_status !== 'rejected' && (
                              <button onClick={() => void patchCeleb(c, { verification_status: 'rejected' })} disabled={actionId === c.id}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20 disabled:opacity-50">
                                Reject
                              </button>
                            )}
                            {c.user.status === 'active' ? (
                              <button onClick={() => void patchUserStatus(c, 'suspended')} disabled={actionId === c.id}
                                className="rounded-lg border border-amber/30 bg-amber/10 px-2 py-1 text-[11px] text-amber hover:bg-amber/20 disabled:opacity-50">
                                Suspend
                              </button>
                            ) : (
                              <button onClick={() => void patchUserStatus(c, 'active')} disabled={actionId === c.id}
                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">
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

              {lastPage > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => { const p = page - 1; setPage(p); void loadPage(q, filterVerification, p) }} disabled={page === 1}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white">
                    Prev
                  </button>
                  <span className="text-sm text-slate-500">Page {page} of {lastPage}</span>
                  <button onClick={() => { const p = page + 1; setPage(p); void loadPage(q, filterVerification, p) }} disabled={page === lastPage}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white">
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'arrangement' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-lg text-sm text-slate-400">
                  Drag rows to set the display order shown on explore pages. Toggle to feature / unfeature a celebrity instantly.
                  Click Save Order to persist row positions.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => void loadArrangement()}
                    className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-400 hover:border-amber/30 hover:text-white">
                    Reload
                  </button>
                  <button onClick={() => void saveOrder()} disabled={!arrangementDirty || savingOrder}
                    className="rounded-xl bg-amber px-5 py-2 text-sm font-semibold text-[#07161e] disabled:opacity-40">
                    {savingOrder ? 'Saving...' : 'Save Order'}
                  </button>
                </div>
              </div>

              {arrangementDirty && (
                <p className="rounded-xl border border-amber/20 bg-amber/5 px-4 py-2 text-xs text-amber">
                  Unsaved order changes. Click Save Order to persist.
                </p>
              )}

              {arrangementLoading ? (
                <div className="flex h-32 items-center justify-center text-slate-400">Loading...</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
                  <div className="hidden grid-cols-[44px_24px_1fr_130px_100px_80px_70px] items-center gap-3 border-b border-white/[0.07] px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-500 sm:grid">
                    <span>Rank</span>
                    <span></span>
                    <span>Celebrity</span>
                    <span>Category</span>
                    <span>Status</span>
                    <span>Featured</span>
                    <span>Rating</span>
                  </div>

                  <div className="divide-y divide-white/[0.04]">
                    {arranged.map((c, idx) => (
                      <div key={c.id} draggable
                        onDragStart={() => onDragStart(idx)}
                        onDragOver={(e) => onDragOver(e, idx)}
                        onDrop={() => onDrop(idx)}
                        onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                        className={[
                          'grid cursor-grab select-none grid-cols-[44px_24px_1fr] items-center gap-3 px-4 py-3 transition active:cursor-grabbing sm:grid-cols-[44px_24px_1fr_130px_100px_80px_70px]',
                          overIdx === idx ? 'border-l-2 border-l-amber bg-amber/5' : 'border-l-2 border-l-transparent hover:bg-white/[0.02]',
                          dragIdx === idx ? 'opacity-30' : '',
                        ].join(' ')}>
                        <span className="text-center text-xs font-bold text-slate-600">{idx + 1}</span>
                        <span className="select-none text-base leading-none text-slate-500">&#8942;</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {c.is_featured && <span className="shrink-0 text-xs text-amber">*</span>}
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-white">{c.stage_name}</div>
                              <div className="truncate text-xs text-slate-500">{c.user.email}</div>
                            </div>
                          </div>
                        </div>
                        <span className="hidden truncate text-sm text-slate-400 sm:block">{c.category ?? '—'}</span>
                        <span className={`hidden w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:inline-block ${verificationClass[c.verification_status] ?? ''}`}>
                          {c.verification_status}
                        </span>
                        <div className="hidden sm:flex">
                          <Toggle on={c.is_featured} onChange={() => void toggleFeatured(c)} title={c.is_featured ? 'Remove from featured' : 'Set as featured'} />
                        </div>
                        <span className="hidden text-sm text-slate-400 sm:block">{parseFloat(c.rating_average ?? '0').toFixed(1)} *</span>
                      </div>
                    ))}

                    {arranged.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">No celebrities found.</div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-600">* = starred / featured celebrity. Toggle applies instantly; row order requires Save Order.</p>
            </div>
          )}
        </div>
      )}
    </DashShell>
  )
}
