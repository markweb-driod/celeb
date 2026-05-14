'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

/* ── Types ── */

type AdminOrder = {
  id: number
  order_number: string
  status: string
  total_amount: string
  subtotal?: string
  platform_fee?: string
  currency: string
  created_at: string
  updated_at?: string
  notes?: string | null
  customization_data?: Record<string, unknown> | null
  service?: { id: number; title: string; service_type?: string }
  fan?: { id: number; display_name: string | null; user?: { email: string } }
  celebrity?: { id: number; stage_name: string }
  booking?: { booking_date: string; booking_time?: string; booking_status: string } | null
  transaction?: { id: number; amount: string; status: string; payment_method?: string } | null
}

type OrdersResponse = {
  orders: { data: AdminOrder[]; last_page: number; current_page: number; total: number }
}

type DetailResponse = { order: AdminOrder }

const STATUS_OPTIONS = ['pending', 'awaiting_confirmation', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded']

const fmt = (amount: string | number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))

const statusClass: Record<string, string> = {
  pending:     'border-amber/30 bg-amber/10 text-amber',
  awaiting_confirmation: 'border-orange-400/30 bg-orange-500/10 text-orange-300',
  confirmed:   'border-blue-400/30 bg-blue-500/10 text-blue-300',
  in_progress: 'border-violet-400/30 bg-violet-500/10 text-violet-300',
  completed:   'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  cancelled:   'border-red-400/30 bg-red-500/10 text-red-300',
  refunded:    'border-slate-400/30 bg-slate-500/10 text-slate-300',
}

/* ── Order detail modal ── */

function OrderDetailModal({ order, onClose, onStatusChange }: {
  order: AdminOrder
  onClose: () => void
  onStatusChange: (id: number, status: string, notes: string) => Promise<void>
}) {
  const [status, setStatus] = useState(order.status)
  const [notes, setNotes] = useState(order.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    setSaving(true); setErr('')
    try {
      await onStatusChange(order.id, status, notes)
      onClose()
    } catch (e) {
      setErr(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const Row = ({ label, val }: { label: string; val: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/[0.05] last:border-0">
      <span className="text-[11px] uppercase tracking-widest text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-200 text-right">{val}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-[#071e29] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sticky top-0 bg-[#071e29]">
          <div>
            <p className="font-display font-bold text-white">{order.order_number}</p>
            <p className="text-[11px] text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Parties */}
          <div className="rounded-xl border border-white/[0.07] bg-[#05131b] p-3 space-y-0.5">
            <Row label="Celebrity"   val={order.celebrity?.stage_name ?? '—'} />
            <Row label="Fan"         val={order.fan?.display_name ?? '—'} />
            <Row label="Fan email"   val={order.fan?.user?.email ?? '—'} />
            <Row label="Service"     val={order.service?.title ?? '—'} />
            {order.service?.service_type && (
              <Row label="Type"        val={order.service.service_type.replace(/_/g, ' ')} />
            )}
          </div>

          {/* Financials */}
          <div className="rounded-xl border border-white/[0.07] bg-[#05131b] p-3 space-y-0.5">
            <Row label="Subtotal"     val={fmt(order.subtotal ?? 0, order.currency)} />
            <Row label="Platform fee" val={fmt(order.platform_fee ?? 0, order.currency)} />
            <Row label="Total"        val={<span className="font-bold text-white">{fmt(order.total_amount, order.currency)}</span>} />
            {order.transaction && (
              <>
                <Row label="Payment"    val={order.transaction.payment_method ?? '—'} />
                <Row label="Txn status" val={order.transaction.status} />
              </>
            )}
          </div>

          {/* Booking */}
          {order.booking && (
            <div className="rounded-xl border border-white/[0.07] bg-[#05131b] p-3 space-y-0.5">
              <Row label="Booking date"   val={order.booking.booking_date} />
              {order.booking.booking_time && <Row label="Time" val={order.booking.booking_time} />}
              <Row label="Booking status" val={order.booking.booking_status} />
            </div>
          )}

          {/* Customization */}
          {order.customization_data && Object.keys(order.customization_data).length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Customization</p>
              <pre className="rounded-xl border border-white/[0.07] bg-[#05131b] p-3 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(order.customization_data, null, 2)}
              </pre>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Internal Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
          </div>

          {/* Status change */}
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Update Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40">
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {err && <p className="text-sm text-red-400">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:border-white/20 hover:text-white">
              Close
            </button>
            <button onClick={save} disabled={saving || status === order.status}
              className="flex-1 rounded-xl bg-amber py-2.5 text-sm font-bold text-[#07161e] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page ── */

export default function AdminOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)

  // Detail modal
  const [viewOrder, setViewOrder] = useState<AdminOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  const loadOrders = async (status: string, p: number, q = searchQ) => {
    const params: Record<string, string | number> = { page: p, per_page: 20 }
    if (status) params.status = status
    if (q.trim()) params.q = q.trim()
    const res = await api.get<OrdersResponse>('/orders', { params })
    setOrders(res.data.orders.data)
    setLastPage(res.data.orders.last_page)
    setTotal(res.data.orders.total)
  }

  useEffect(() => {
    const init = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        await loadOrders('', 1)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [router])

  const openDetail = async (order: AdminOrder) => {
    setDetailLoading(true)
    try {
      const res = await api.get<DetailResponse>(`/orders/${order.id}`)
      setViewOrder(res.data.order)
    } catch {
      setViewOrder(order) // fallback to list data
    } finally {
      setDetailLoading(false)
    }
  }

  const updateStatus = async (id: number, status: string, notes?: string) => {
    setActionId(id)
    try {
      await api.patch(`/orders/${id}/status`, { status, ...(notes !== undefined ? { notes } : {}) })
      await loadOrders(filterStatus, page)
      flash(`Order status → ${status}.`)
    } finally {
      setActionId(null)
    }
  }

  const cancelOrder = async (order: AdminOrder) => {
    if (!window.confirm(`Cancel order ${order.order_number}?`)) return
    setActionId(order.id); setError('')
    try {
      await api.patch(`/orders/${order.id}/status`, { status: 'cancelled' })
      await loadOrders(filterStatus, page)
      flash('Order cancelled.')
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">

      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onStatusChange={updateStatus}
        />
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Order Oversight</h1>
              <p className="text-sm text-slate-500">{total} total orders</p>
            </div>
          </div>

          {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{message}</div>}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); void loadOrders(filterStatus, 1, searchQ) } }}
              placeholder="Search order #…"
              className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-amber/40 w-44"
            />
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); void loadOrders(e.target.value, 1, searchQ) }}
              className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <button
              onClick={() => { setPage(1); void loadOrders(filterStatus, 1, searchQ) }}
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
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Order</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Service</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Celebrity</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Fan</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {orders.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No orders found.</td></tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-white">{order.order_number}</p>
                      <p className="text-[11px] text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{order.service?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{order.celebrity?.stage_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{order.fan?.display_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[order.status] ?? ''}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {fmt(order.total_amount, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {/* View */}
                        <button
                          onClick={() => void openDetail(order)}
                          disabled={detailLoading}
                          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:border-amber/30 hover:text-amber disabled:opacity-40"
                        >
                          👁 View
                        </button>
                        {/* Quick status change */}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => void updateStatus(order.id, 'confirmed')}
                            disabled={actionId === order.id}
                            className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-300 hover:bg-blue-500/20 disabled:opacity-40"
                          >
                            Confirm
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => void updateStatus(order.id, 'in_progress')}
                            disabled={actionId === order.id}
                            className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-300 hover:bg-violet-500/20 disabled:opacity-40"
                          >
                            In Progress
                          </button>
                        )}
                        {(order.status === 'in_progress' || order.status === 'confirmed') && (
                          <button
                            onClick={() => void updateStatus(order.id, 'completed')}
                            disabled={actionId === order.id}
                            className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                          >
                            Complete
                          </button>
                        )}
                        {order.status === 'completed' && (
                          <button
                            onClick={() => void updateStatus(order.id, 'refunded')}
                            disabled={actionId === order.id}
                            className="rounded-lg border border-slate-400/30 bg-slate-500/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-500/20 disabled:opacity-40"
                          >
                            Refund
                          </button>
                        )}
                        {/* Cancel */}
                        {!['cancelled', 'refunded', 'completed'].includes(order.status) && (
                          <button
                            onClick={() => void cancelOrder(order)}
                            disabled={actionId === order.id}
                            className="rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/15 disabled:opacity-40"
                          >
                            Cancel
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
                onClick={() => { const p = page - 1; setPage(p); void loadOrders(filterStatus, p) }}
                disabled={page === 1}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-500">Page {page} of {lastPage}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); void loadOrders(filterStatus, p) }}
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
