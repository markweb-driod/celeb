'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

type Fan = {
  id: number
  display_name: string | null
  avatar_url: string | null
  total_spent: string
  total_bookings: number
  user: {
    id: number
    email: string
    status: 'active' | 'suspended' | 'banned'
    created_at: string
  }
}

type FansResponse = {
  fans: { data: Fan[]; last_page: number; current_page: number }
}

const statusClass: Record<string, string> = {
  active:    'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  suspended: 'border-amber/30 bg-amber/10 text-amber',
  banned:    'border-red-400/30 bg-red-500/10 text-red-300',
}

export default function AdminFansPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [fans, setFans] = useState<Fan[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async (search: string, status: string, p: number) => {
    const params: Record<string, string | number> = { per_page: 20, page: p }
    if (search) params.q = search
    if (status) params.status = status
    const res = await api.get<FansResponse>('/admin/fans', { params })
    setFans(res.data.fans.data)
    setLastPage(res.data.fans.last_page)
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

  const patchUserStatus = async (fan: Fan, status: string) => {
    setActionId(fan.id)
    setError('')
    try {
      await api.patch(`/admin/fans/${fan.id}/user-status`, { status })
      await load(q, filterStatus, page)
      setMessage('User status updated.')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold text-white">Fan Management</h1>
            <span className="text-sm text-slate-500">{fans.length} shown</span>
          </div>

          {error   && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{message}</div>}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load(q, filterStatus, 1)}
              placeholder="Search name or email…"
              className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber/40 w-56"
            />
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); void load(q, e.target.value, 1) }}
              className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
            <button
              onClick={() => void load(q, filterStatus, 1)}
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
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Fan</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Total Spent</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Bookings</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Joined</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {fans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No fans found.</td>
                  </tr>
                ) : fans.map((f) => (
                  <tr key={f.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{f.display_name ?? '(no display name)'}</div>
                      <div className="text-xs text-slate-500">{f.user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[f.user.status] ?? ''}`}>
                        {f.user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">${parseFloat(f.total_spent).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-300">{f.total_bookings}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(f.user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {f.user.status === 'active' ? (
                          <>
                            <button
                              onClick={() => void patchUserStatus(f, 'suspended')}
                              disabled={actionId === f.id}
                              className="rounded-lg border border-amber/30 bg-amber/10 px-2 py-1 text-[11px] text-amber hover:bg-amber/20 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => void patchUserStatus(f, 'banned')}
                              disabled={actionId === f.id}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Ban
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => void patchUserStatus(f, 'active')}
                            disabled={actionId === f.id}
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
                onClick={() => { const p = page - 1; setPage(p); void load(q, filterStatus, p) }}
                disabled={page === 1}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-500">Page {page} of {lastPage}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); void load(q, filterStatus, p) }}
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
