'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type Service = {
  id: number
  title: string
  service_type: string
  base_price: string
  currency: string
  status: string
  total_sold: number
}

type ServicePayload = { services: Service[] | { data?: Service[] } }

type Order = {
  id: number
  order_number: string
  status: string
  total_amount: string
  currency: string
  created_at: string
  fan?: { fan_profile?: { display_name: string | null } }
}

type OrderPayload = { orders: { data: Order[]; total: number } }

const svcStatusMeta: Record<string, { label: string; cls: string }> = {
  active:  { label: 'Active',  cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
  draft:   { label: 'Draft',   cls: 'border-amber/30 bg-amber/10 text-amber' },
  paused:  { label: 'Paused',  cls: 'border-slate-400/30 bg-slate-500/10 text-slate-300' },
}

const orderStatusMeta: Record<string, { label: string; cls: string; icon: string }> = {
  pending:     { label: 'Pending',     cls: 'border-amber/30 bg-amber/10 text-amber',                       icon: '⏳' },
  confirmed:   { label: 'Confirmed',   cls: 'border-blue-400/30 bg-blue-500/10 text-blue-300',              icon: '✅' },
  in_progress: { label: 'In Progress', cls: 'border-violet-400/30 bg-violet-500/10 text-violet-300',        icon: '🎬' },
  completed:   { label: 'Completed',   cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',     icon: '🎉' },
  cancelled:   { label: 'Cancelled',   cls: 'border-red-400/30 bg-red-500/10 text-red-300',                 icon: '✕' },
}

const fmt = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(amount))

const navItems = [
  { href: '/celebrity/dashboard', label: 'Overview',  icon: '🏠' },
  { href: '/celebrity/services',  label: 'Services',   icon: '🎬' },
  { href: '/celebrity/orders',    label: 'Orders',     icon: '📦' },
  { href: '/celebrity/earnings',  label: 'Earnings',   icon: '💰' },
  { href: '/celebrity/chat',      label: 'Fan Chat',   icon: '💬' },
  { href: '/celebrity/profile',   label: 'Profile',    icon: '⭐' },
]

export default function CelebrityDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'celebrity') { router.replace('/fan/dashboard'); return }
        setUser(me.data)
        const svcRes = await api.get<ServicePayload>('/celebrity/services')
        const raw = svcRes.data.services
        setServices(Array.isArray(raw) ? raw : raw.data ?? [])
        try {
          const ordRes = await api.get<OrderPayload>('/orders')
          setRecentOrders(ordRes.data.orders.data.slice(0, 5))
          setTotalOrders(ordRes.data.orders.total)
        } catch {
          // orders endpoint may not exist yet — fail gracefully
        }
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [router])

  const totalSold = useMemo(() => services.reduce((s, svc) => s + svc.total_sold, 0), [services])
  const activeServices = useMemo(() => services.filter(s => s.status === 'active').length, [services])
  const revenue = useMemo(() =>
    recentOrders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount), 0),
  [recentOrders])

  const stageName = user?.celebrity_profile?.stage_name ?? user?.celebrityProfile?.stage_name ?? 'Creator'
  const initials = stageName.slice(0, 2).toUpperCase()

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

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber/40 to-orange-600/40 font-display text-xl font-bold text-white ring-2 ring-amber/20">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber">Creator workspace</p>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{stageName}</h1>
              </div>
            </div>
            <Link href="/celebrity/services/new" className="rounded-xl bg-gradient-to-br from-amber to-amber-lt px-5 py-2.5 text-sm font-bold text-[#07161e] shadow-[0_4px_20px_rgba(255,177,27,0.25)] transition hover:-translate-y-0.5">
              + New service
            </Link>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: 'Total services', value: services.length, icon: '🎬', color: 'from-amber/20 to-orange-600/10' },
              { label: 'Active services', value: activeServices, icon: '✅', color: 'from-emerald-500/20 to-green-600/10' },
              { label: 'Total sold', value: totalSold, icon: '🛒', color: 'from-violet-500/20 to-purple-600/10' },
              { label: 'Revenue (recent)', value: fmt(String(revenue), 'USD'), icon: '💰', color: 'from-mint/20 to-teal-600/10' },
            ].map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/80 p-5">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-60`} />
                <div className="relative">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
                    <span className="text-xl">{s.icon}</span>
                  </div>
                  <p className="font-display text-3xl font-bold text-white">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Services list */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-display text-sm font-bold text-white">Your Services</h2>
              <Link href="/celebrity/services" className="text-xs font-semibold text-amber transition hover:text-white">Manage all →</Link>
            </div>
            {services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="mb-3 text-4xl">🎬</span>
                <p className="font-display text-sm font-semibold text-white">No services yet</p>
                <p className="mt-1 text-xs text-slate-600">Create your first service to start earning</p>
                <Link href="/celebrity/services/new" className="mt-4 rounded-xl bg-amber/90 px-5 py-2 text-xs font-bold text-[#07161e] hover:bg-amber">
                  Create service →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {services.slice(0, 6).map((svc) => {
                  const meta = svcStatusMeta[svc.status] ?? svcStatusMeta.draft
                  return (
                    <div key={svc.id} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.02]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{svc.title}</p>
                        <p className="text-[11px] capitalize text-slate-600">{svc.service_type.replaceAll('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.cls}`}>{meta.label}</span>
                        <span className="text-sm font-bold text-amber">{fmt(svc.base_price, svc.currency)}</span>
                        <span className="text-[11px] text-slate-600">{svc.total_sold} sold</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent orders */}
          {recentOrders.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <h2 className="font-display text-sm font-bold text-white">Recent Orders</h2>
                <Link href="/celebrity/orders" className="text-xs font-semibold text-amber transition hover:text-white">View all →</Link>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {recentOrders.map((order) => {
                  const meta = orderStatusMeta[order.status] ?? orderStatusMeta.pending
                  return (
                    <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-base">{meta.icon}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{order.order_number}</p>
                        <p className="text-[11px] text-slate-600">{order.fan?.fan_profile?.display_name ?? 'Fan'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${meta.cls}`}>{meta.label}</span>
                        <span className="text-[11px] font-semibold text-amber">{fmt(order.total_amount, order.currency)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Earnings CTA */}
          <div className="overflow-hidden rounded-2xl border border-amber/20 bg-gradient-to-br from-amber/10 to-orange-900/20 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-display text-base font-bold text-white">Boost your earnings</p>
                <p className="mt-1 text-sm text-slate-500">Add more services, enable premium tiers, and reach more fans.</p>
              </div>
              <Link href="/celebrity/services/new" className="rounded-xl bg-amber/90 px-6 py-2.5 text-sm font-bold text-[#07161e] transition hover:bg-amber">
                Add service →
              </Link>
            </div>
          </div>

        </div>
      )}
    </DashShell>
  )
}
