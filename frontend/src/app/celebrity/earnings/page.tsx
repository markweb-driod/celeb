'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type Order = {
  id: number
  status: string
  total_amount: string
  platform_fee: string
  currency: string
  created_at: string
  service?: { id: number; title: string } | null
}

type Service = {
  id: number
  title: string
  base_price: string
  total_sold: number
  status?: string
}

type OrdersPayload = { orders: { data: Order[] } }
type ServicesPayload = { services: Service[] }

const navItems = [
  { href: '/celebrity/dashboard', label: 'Overview', icon: 'OV' },
  { href: '/celebrity/services', label: 'Services', icon: 'SV' },
  { href: '/celebrity/orders', label: 'Orders', icon: 'OR' },
  { href: '/celebrity/earnings', label: 'Earnings', icon: 'EC' },
  { href: '/celebrity/chat',      label: 'Fan Chat',   icon: 'CH' },
  { href: '/celebrity/profile', label: 'Profile', icon: 'PR' },
]

const formatMoney = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

export default function CelebrityEarningsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

        const [orderRes, serviceRes] = await Promise.all([
          api.get<OrdersPayload>('/orders'),
          api.get<ServicesPayload>('/celebrity/services'),
        ])

        setOrders(orderRes.data.orders.data ?? [])
        setServices(serviceRes.data.services ?? [])
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const completedOrders = useMemo(() => orders.filter((order) => order.status === 'completed'), [orders])

  const grossRevenue = useMemo(
    () => completedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [completedOrders],
  )

  const platformFees = useMemo(
    () => completedOrders.reduce((sum, order) => sum + Number(order.platform_fee || 0), 0),
    [completedOrders],
  )

  const netRevenue = useMemo(() => grossRevenue - platformFees, [grossRevenue, platformFees])

  const currentMonthRevenue = useMemo(() => {
    const now = new Date()
    return completedOrders
      .filter((order) => {
        const dt = new Date(order.created_at)
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
      })
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
  }, [completedOrders])

  const topServices = useMemo(() => {
    const ranked = [...services].sort((a, b) => Number(b.total_sold || 0) - Number(a.total_sold || 0))
    return ranked.slice(0, 4)
  }, [services])

  const currency = completedOrders[0]?.currency || 'USD'
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
            <p className="text-xs font-semibold uppercase tracking-widest text-amber">Revenue center</p>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Earnings analytics</h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Gross revenue', value: formatMoney(grossRevenue, currency), icon: '$', color: 'from-amber/20 to-orange-600/10' },
              { label: 'Platform fees', value: formatMoney(platformFees, currency), icon: 'PF', color: 'from-rose-500/20 to-red-600/10' },
              { label: 'Net earnings', value: formatMoney(netRevenue, currency), icon: 'NET', color: 'from-emerald-500/20 to-green-600/10' },
              { label: 'This month', value: formatMoney(currentMonthRevenue, currency), icon: 'MTH', color: 'from-violet-500/20 to-purple-600/10' },
            ].map((stat) => (
              <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/80 p-5">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-60`} />
                <div className="relative">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{stat.label}</p>
                    <span className="text-xl">{stat.icon}</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <h2 className="font-display text-sm font-bold text-white">Top performing services</h2>
              </div>
              {topServices.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">Create services to track performance here.</div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {topServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{service.title}</p>
                        <p className="text-[11px] text-slate-600">{service.total_sold} sold</p>
                      </div>
                      <p className="text-sm font-semibold text-amber">{formatMoney(Number(service.base_price || 0), currency)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-amber/20 bg-gradient-to-br from-amber/10 to-orange-900/20 p-6">
              <p className="font-display text-lg font-bold text-white">Payout readiness</p>
              <p className="mt-2 text-sm text-slate-400">
                Keep at least one active service and maintain on-time delivery to maximize conversion and completed order value.
              </p>
              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-slate-400">Completed orders</span>
                  <span className="font-semibold text-white">{completedOrders.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-slate-400">Active services</span>
                  <span className="font-semibold text-white">{services.filter((s) => s.status === 'active').length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-slate-400">Estimated next payout</span>
                  <span className="font-semibold text-amber">{formatMoney(netRevenue, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashShell>
  )
}

