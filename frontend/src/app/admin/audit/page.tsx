'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

type AuditLog = {
  type: string
  category: 'user' | 'transaction' | 'order'
  label: string
  detail: string
  meta: Record<string, string | number | null>
  created_at: string
}

type AuditResponse = {
  logs: AuditLog[]
}

const categoryColors: Record<string, string> = {
  user:        'border-blue-400/30 bg-blue-500/10 text-blue-300',
  transaction: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  order:       'border-amber/30 bg-amber/10 text-amber',
}

const categoryIcons: Record<string, string> = {
  user:        '👤',
  transaction: '💳',
  order:       '📦',
}

const typeColorMap: Record<string, string> = {
  user_registered:     'bg-blue-500/20 text-blue-400 border-blue-500/30',
  transaction_payment: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  transaction_refund:  'bg-red-500/20 text-red-400 border-red-500/30',
  transaction_payout:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  order_completed:     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  order_pending:       'bg-amber/20 text-amber border-amber/30',
  order_cancelled:     'bg-red-500/20 text-red-400 border-red-500/30',
  order_confirmed:     'bg-blue-500/20 text-blue-400 border-blue-500/30',
  order_refunded:      'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AdminAuditPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (type: string) => {
    const params: Record<string, string> = { per_page: '50' }
    if (type) params.type = type
    const res = await api.get<AuditResponse>('/admin/audit', { params })
    setLogs(res.data.logs)
  }

  useEffect(() => {
    const init = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        await load('')
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [router])

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Audit Log</h1>
              <p className="mt-1 text-sm text-slate-500">Recent platform activity — users, transactions, orders</p>
            </div>
            <button
              onClick={() => void load(filterCategory)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-400 hover:border-amber/30 hover:text-white"
            >
              ↻ Refresh
            </button>
          </div>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}

          {/* Filter */}
          <div className="flex gap-2">
            {(['', 'user', 'transaction', 'order'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => { setFilterCategory(cat); void load(cat) }}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  filterCategory === cat
                    ? 'border-amber/30 bg-amber/10 text-amber'
                    : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                }`}
              >
                {cat === '' ? 'All' : `${categoryIcons[cat]} ${cat}`}
              </button>
            ))}
          </div>

          {/* Log feed */}
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-8 text-center text-sm text-slate-500">
                No activity logs found.
              </div>
            ) : logs.map((log, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-[#071e29]/60 px-4 py-3 hover:bg-[#071e29]/80 transition"
              >
                {/* Category badge */}
                <span className="mt-0.5 shrink-0 text-lg">{categoryIcons[log.category] ?? '📋'}</span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeColorMap[log.type] ?? categoryColors[log.category] ?? ''}`}>
                      {log.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{log.label}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{log.detail}</p>

                  {/* Meta pills */}
                  {Object.keys(log.meta).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {Object.entries(log.meta).map(([k, v]) =>
                        v !== null ? (
                          <span key={k} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-500">
                            <span className="text-slate-600">{k}:</span> {String(v)}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                <span className="shrink-0 text-xs text-slate-600 whitespace-nowrap mt-0.5">{timeAgo(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashShell>
  )
}
