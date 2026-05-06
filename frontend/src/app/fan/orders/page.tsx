'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

const navItems = [
  { href: '/fan/dashboard',       label: 'Overview',        icon: '🏠' },
  { href: '/fan/explore',         label: 'Explore',         icon: '🔍' },
  { href: '/fan/orders',          label: 'My Bookings',     icon: '📦' },
  { href: '/fan/subscriptions',   label: 'Subscriptions',   icon: '⭐' },
  { href: '/fan/chat',            label: 'Chat',            icon: '💬' },
  { href: '/fan/tickets',         label: 'Tickets',         icon: '🎟️' },
  { href: '/fan/merch',           label: 'Merch Store',     icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault',           label: 'My Vault',        icon: '🔒' },
  { href: '/fan/profile',         label: 'Profile',         icon: '👤' },
]

type Order = {
  id: number
  order_number: string
  status: string
  total_amount: string
  currency: string
  created_at: string
  service: {
    title: string
    service_type: string
    celebrity_profile?: { stage_name: string }
  } | null
}

type OrderPayload = { orders: { data: Order[]; total: number } }

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

const statusMeta: Record<string, { label: string; cls: string; icon: string }> = {
  pending:     { label: 'Pending',     cls: 'border-amber/30 bg-amber/10 text-amber',                    icon: '⏳' },
  confirmed:   { label: 'Confirmed',   cls: 'border-blue-400/30 bg-blue-500/10 text-blue-300',           icon: '✅' },
  in_progress: { label: 'In Progress', cls: 'border-violet-400/30 bg-violet-500/10 text-violet-300',     icon: '🎬' },
  completed:   { label: 'Completed',   cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',  icon: '🏆' },
  cancelled:   { label: 'Cancelled',   cls: 'border-red-400/30 bg-red-500/10 text-red-300',              icon: '✕'  },
  refunded:    { label: 'Refunded',    cls: 'border-slate-400/30 bg-slate-500/10 text-slate-300',        icon: '↩'  },
}

const serviceTypeLabel: Record<string, string> = {
  fan_card: 'Fan Card', video_message: 'Video Message', private_event: 'Private Event',
  birthday_performance: 'Birthday', meet_greet: 'Meet & Greet', merchandise: 'Merch',
  exclusive_content: 'Exclusive Content', membership: 'Membership',
}

const fmt = (amount: string, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function FanOrdersPage() {
  const router = useRouter()
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [orders, setOrders]   = useState<Order[]>([])
  const [total, setTotal]     = useState(0)
  const [filter, setFilter]   = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
        setUser(me.data)
        const o = await api.get<OrderPayload>('/orders')
        setOrders(o.data.orders.data)
        setTotal(o.data.orders.total)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [router])

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'
  const completed   = orders.filter(o => o.status === 'completed')
  const active      = orders.filter(o => ['pending', 'confirmed', 'in_progress'].includes(o.status))
  const totalSpent  = completed.reduce((s, o) => s + Number(o.total_amount), 0)
  const visible     = filter === 'all' ? orders : orders.filter(o => o.status === filter)

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">My Bookings</h1>
              <p className="mt-1 text-sm text-slate-400">Track your orders and booking history</p>
            </div>
            <Link href="/fan/explore" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold">+ New Booking</Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {([
              { label: 'Total bookings', value: total,                  icon: '📦', sub: 'All time',    color: 'from-mint/20 to-teal-600/10' },
              { label: 'Active orders',  value: active.length,          icon: '🎬', sub: 'In progress', color: 'from-violet-500/20 to-purple-600/10' },
              { label: 'Total spent',    value: fmt(String(totalSpent)), icon: '💳', sub: 'Completed',   color: 'from-amber/20 to-orange-600/10' },
            ] as { label: string; value: string | number; icon: string; sub: string; color: string }[]).map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/80 p-5">
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

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-xl px-4 py-1.5 text-xs font-semibold capitalize transition ${
                  filter === s
                    ? 'bg-mint text-[#07161e]'
                    : 'border border-white/10 text-slate-400 hover:border-mint/30 hover:text-mint-soft'
                }`}
              >
                {s === 'all' ? `All (${total})` : s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-sm text-slate-400">
                {filter === 'all' ? 'No bookings yet.' : `No ${filter.replace('_', ' ')} orders.`}
              </p>
              <Link href="/fan/explore" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold">Browse creators</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((order) => {
                const meta = statusMeta[order.status] ?? { label: order.status, cls: 'border-slate-500/20 bg-slate-500/10 text-slate-400', icon: '•' }
                const celebName    = order.service?.celebrity_profile?.stage_name ?? '—'
                const serviceTitle = order.service?.title ?? 'Unknown service'
                const typeLabel    = serviceTypeLabel[order.service?.service_type ?? ''] ?? ''
                return (
                  <div key={order.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-4 transition hover:border-white/[0.12] sm:flex-nowrap">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-mint/10 text-xl">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{serviceTitle}</p>
                      <p className="text-xs text-slate-500">
                        {celebName}{typeLabel ? ` · ${typeLabel}` : ''} · {fmtDate(order.created_at)}
                      </p>
                    </div>
                    <p className="hidden text-[11px] font-mono text-slate-600 sm:block">{order.order_number}</p>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <p className="w-20 text-right text-sm font-bold text-white">
                      {fmt(order.total_amount, order.currency)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </DashShell>
  )
}
