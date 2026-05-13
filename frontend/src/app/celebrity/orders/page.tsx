'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type Order = {
  id: number
  order_number: string
  status: string
  total_amount: string
  platform_fee: string
  currency: string
  created_at: string
  service?: { title?: string } | null
  fan?: { display_name?: string | null } | null
}

type OrdersPayload = {
  orders: {
    data: Order[]
    total: number
  }
}

const navItems = [
  { href: '/celebrity/dashboard', label: 'Overview', icon: '🏠' },
  { href: '/celebrity/services',  label: 'Services',  icon: '🎬' },
  { href: '/celebrity/orders',    label: 'Orders',    icon: '📦' },
  { href: '/celebrity/earnings',  label: 'Earnings',  icon: '💰' },
  { href: '/celebrity/chat',      label: 'Fan Chat',  icon: '💬' },
  { href: '/celebrity/profile',   label: 'Profile',   icon: '⭐' },
]

const statusMeta: Record<string, { label: string; cls: string; icon: string }> = {
  pending: { label: 'Pending', cls: 'border-amber/30 bg-amber/10 text-amber', icon: '⏳' },
  confirmed: { label: 'Confirmed', cls: 'border-blue-400/30 bg-blue-500/10 text-blue-300', icon: '✅' },
  in_progress: { label: 'In Progress', cls: 'border-violet-400/30 bg-violet-500/10 text-violet-300', icon: '🎬' },
  completed: { label: 'Completed', cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300', icon: '🎉' },
  cancelled: { label: 'Cancelled', cls: 'border-red-400/30 bg-red-500/10 text-red-300', icon: '✕' },
}

const formatMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(amount || 0))

export default function CelebrityOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) {
        router.replace('/login')
        return
      }

      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'celebrity') {
          router.replace('/fan/dashboard')
          return
        }
        setUser(me.data)

        const res = await api.get<OrdersPayload>('/orders')
        setOrders(res.data.orders.data ?? [])
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const visibleOrders = useMemo(
    () => (statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter)),
    [orders, statusFilter],
  )

  const totalRevenue = useMemo(
    () => orders.filter((order) => order.status === 'completed').reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [orders],
  )

  const activeOrders = useMemo(
    () => orders.filter((order) => ['pending', 'confirmed', 'in_progress'].includes(order.status)).length,
    [orders],
  )

  const updateOrderStatus = async (orderId: number, status: string) => {
    setActionLoading(orderId)
    setActionMessage('')
    try {
      const res = await api.patch<{ order: Order }>(`/orders/${orderId}/status`, { status })
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: res.data.order.status } : o))
      setActionMessage(`Order updated to ${status}.`)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionLoading(null)
    }
  }

  const stageName = user?.celebrity_profile?.stage_name ?? user?.celebrityProfile?.stage_name ?? user?.email ?? 'Creator'

  return (
    <DashShell navItems={navItems} userName={stageName} roleLabel="Creator" accentColor="amber">
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber">Order queue</p>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Creator orders</h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total orders', value: orders.length, icon: '📦', color: 'from-amber/20 to-orange-600/10' },
              { label: 'Active orders', value: activeOrders, icon: '🎬', color: 'from-violet-500/20 to-purple-600/10' },
              { label: 'Completed revenue', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(totalRevenue), icon: '💰', color: 'from-emerald-500/20 to-green-600/10' },
            ].map((stat) => (
              <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/80 p-5">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-60`} />
                <div className="relative">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{stat.label}</p>
                    <span className="text-xl">{stat.icon}</span>
                  </div>
                  <p className="font-display text-3xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  statusFilter === status
                    ? 'border-amber/40 bg-amber/10 text-amber'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'
                }`}
              >
                {status.replaceAll('_', ' ')}
              </button>
            ))}
          </div>

          {actionMessage && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{actionMessage}</div>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-display text-sm font-bold text-white">Orders</h2>
              <span className="text-xs text-slate-600">{visibleOrders.length} shown</span>
            </div>

            {visibleOrders.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-sm text-slate-500">No orders in this status yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {visibleOrders.map((order) => {
                  const meta = statusMeta[order.status] ?? statusMeta.pending
                  return (
                    <div key={order.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-lg">{meta.icon}</div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{order.service?.title ?? 'Service order'}</p>
                        <p className="text-[11px] text-slate-600">
                          {order.order_number} · {order.fan?.display_name || 'Fan'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.cls}`}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] font-semibold text-amber">
                          {formatMoney(order.total_amount, order.currency)}
                        </span>
                        <div className="mt-1 flex gap-1">
                          {order.status === 'pending' && (
                            <>
                              <button disabled={actionLoading === order.id} onClick={() => void updateOrderStatus(order.id, 'confirmed')} className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 disabled:opacity-50 hover:bg-blue-500/20">Confirm</button>
                              <button disabled={actionLoading === order.id} onClick={() => void updateOrderStatus(order.id, 'cancelled')} className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300 disabled:opacity-50 hover:bg-red-500/20">Cancel</button>
                            </>
                          )}
                          {order.status === 'confirmed' && (
                            <button disabled={actionLoading === order.id} onClick={() => void updateOrderStatus(order.id, 'in_progress')} className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300 disabled:opacity-50 hover:bg-violet-500/20">Start</button>
                          )}
                          {order.status === 'in_progress' && (
                            <button disabled={actionLoading === order.id} onClick={() => void updateOrderStatus(order.id, 'completed')} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 disabled:opacity-50 hover:bg-emerald-500/20">Complete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashShell>
  )
}
