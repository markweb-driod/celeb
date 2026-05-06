'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type Order = {
  id: number
  order_number: string
  status: string
  total_amount: string
  currency: string
  created_at: string
  service: { title: string; celebrity_profile?: { stage_name: string } } | null
}

type OrderPayload = { orders: { data: Order[]; total: number } }

const statusMeta: Record<string, { label: string; cls: string; icon: string }> = {
  pending:     { label: 'Pending',     cls: 'border-amber/30 bg-amber/10 text-amber',                       icon: '⏳' },
  confirmed:   { label: 'Confirmed',   cls: 'border-blue-400/30 bg-blue-500/10 text-blue-300',              icon: '✅' },
  in_progress: { label: 'In Progress', cls: 'border-violet-400/30 bg-violet-500/10 text-violet-300',        icon: '🔄' },
  completed:   { label: 'Completed',   cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',     icon: '🎉' },
  cancelled:   { label: 'Cancelled',   cls: 'border-red-400/30 bg-red-500/10 text-red-300',                 icon: '❌' },
  refunded:    { label: 'Refunded',    cls: 'border-slate-400/30 bg-slate-500/10 text-slate-300',           icon: '↩' },
}

const fmt = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(amount))

const navItems = [
  { href: '/fan/dashboard',     label: 'Overview',       icon: '🏠' },
  { href: '/fan/explore',       label: 'Explore',        icon: '🔍' },
  { href: '/fan/orders',        label: 'My Bookings',    icon: '📦' },
  { href: '/fan/subscriptions', label: 'Subscriptions',  icon: '⭐' },
  { href: '/fan/chat',          label: 'Chat',           icon: '💬' },
  { href: '/fan/tickets',       label: 'Tickets',        icon: '🎟️' },
  { href: '/fan/merch',         label: 'Merch Store',    icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault',         label: 'My Vault',       icon: '🔒' },
  { href: '/fan/profile',       label: 'Profile',        icon: '👤' },
]

export default function FanDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
        setUser(me.data)
        const o = await api.get<OrderPayload>('/orders')
        setOrders(o.data.orders.data.slice(0, 5))
        setTotalOrders(o.data.orders.total)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [router])

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'
  const initials = displayName.slice(0, 2).toUpperCase()
  const spent = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount), 0)
  const active = orders.filter(o => ['pending','confirmed','in_progress'].includes(o.status)).length

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mint/40 to-teal-600/40 font-display text-xl font-bold text-white ring-2 ring-mint/20">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-mint-soft">Welcome back</p>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{displayName}</h1>
              </div>
            </div>
            <Link href="/fan/explore" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold">Browse talents →</Link>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total bookings', value: totalOrders, icon: '📦', sub: 'All time',          color: 'from-mint/20 to-teal-600/10' },
              { label: 'Active orders',  value: active,      icon: '🔄', sub: 'In progress',       color: 'from-violet-500/20 to-purple-600/10' },
              { label: 'Total spent',    value: `$${spent.toFixed(0)}`, icon: '💰', sub: 'Completed', color: 'from-amber/20 to-orange-600/10' },
            ].map((s) => (
              <div key={s.label} className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/80 p-5`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-60`} />
                <div className="relative">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
                    <span className="text-xl">{s.icon}</span>
                  </div>
                  <p className="font-display text-3xl font-bold text-white">{s.value}</p>
                  <p className="mt-1 text-[11px] text-slate-600">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent orders */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-display text-sm font-bold text-white">Recent Bookings</h2>
              <Link href="/fan/orders" className="text-xs font-semibold text-mint-soft transition hover:text-white">View all →</Link>
            </div>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="mb-3 text-4xl">📦</span>
                <p className="font-display text-sm font-semibold text-white">No bookings yet</p>
                <p className="mt-1 text-xs text-slate-600">Book your first celebrity experience</p>
                <Link href="/fan/explore" className="btn-primary mt-4 rounded-xl px-5 py-2 text-xs font-semibold">Explore talents →</Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {orders.map((order) => {
                  const meta = statusMeta[order.status] ?? statusMeta.pending
                  return (
                    <div key={order.id} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.02]">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
                        {meta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{order.service?.title ?? 'Service'}</p>
                        <p className="text-[11px] text-slate-600">
                          {order.service?.celebrity_profile?.stage_name && <span className="text-slate-500">{order.service.celebrity_profile.stage_name} · </span>}
                          {order.order_number}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.cls}`}>{meta.label}</span>
                        <span className="text-[11px] font-semibold text-amber">{fmt(order.total_amount, order.currency)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="overflow-hidden rounded-2xl border border-mint/20 bg-gradient-to-br from-mint/10 to-teal-900/20 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-display text-base font-bold text-white">Ready for your next experience?</p>
                <p className="mt-1 text-sm text-slate-500">10,000+ verified celebrities ready to connect with fans like you.</p>
              </div>
              <Link href="/fan/explore" className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">Browse now →</Link>
            </div>
          </div>
        </div>
      )}
    </DashShell>
  )
}
