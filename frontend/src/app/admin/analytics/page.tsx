'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

type MonthRow = {
  month: string
  gross: number
  refunds: number
  net: number
  platform_fees: number
  total_orders: number
  new_fans: number
  new_celebrities: number
}

type AnalyticsResponse = {
  kpis: {
    total_gross_revenue: number
    total_refunds: number
    net_revenue: number
    platform_fees: number
    total_orders: number
    completed_orders: number
    conversion_rate: number
    total_users: number
    total_celebrities: number
    total_fans: number
    active_celebrities: number
    verified_celebrities: number
  }
  monthly: MonthRow[]
  orders_by_status: Record<string, number>
  top_categories: Array<{ category: string; order_count: number; revenue: string }>
  top_celebrities: Array<{ id: number; stage_name: string; completed_orders: number; total_revenue: string; user: { email: string } | null }>
}

function BarChart({ data, valueKey, labelKey, colorClass = 'bg-amber/70' }: {
  data: Record<string, number | string>[]
  valueKey: string
  labelKey: string
  colorClass?: string
}) {
  const values = data.map((d) => Number(d[valueKey]) || 0)
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => {
        const pct = (values[i] / max) * 100
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
              <div
                className={`w-full rounded-t-md ${colorClass} transition-all`}
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${d[labelKey]}: ${values[i]}`}
              />
            </div>
            <span className="text-[9px] text-slate-600 truncate w-full text-center">{String(d[labelKey]).replace(' 20', " '")}</span>
          </div>
        )
      })}
    </div>
  )
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500',
  pending:   'bg-amber',
  confirmed: 'bg-blue-500',
  cancelled: 'bg-red-500',
  refunded:  'bg-slate-500',
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        const res = await api.get<AnalyticsResponse>('/admin/analytics')
        setData(res.data)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [router])

  const kpis = data?.kpis
  const monthly = data?.monthly ?? []
  const ordersByStatus = data?.orders_by_status ?? {}
  const totalOrdersCount = Object.values(ordersByStatus).reduce((a, b) => a + b, 0)

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-6">
          <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>

          {/* KPI row 1 — revenue */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Gross revenue',    value: `$${(kpis?.total_gross_revenue ?? 0).toFixed(2)}`,  sub: 'all time payments',   color: 'text-white' },
              { label: 'Net revenue',      value: `$${(kpis?.net_revenue ?? 0).toFixed(2)}`,          sub: 'after refunds',       color: 'text-emerald-400' },
              { label: 'Platform fees',    value: `$${(kpis?.platform_fees ?? 0).toFixed(2)}`,        sub: 'earned commissions',  color: 'text-amber' },
              { label: 'Total refunds',    value: `$${(kpis?.total_refunds ?? 0).toFixed(2)}`,        sub: 'refunded to users',   color: 'text-red-400' },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                <p className={`mt-2 font-display text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="mt-1 text-xs text-slate-600">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* KPI row 2 — users & orders */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total users',         value: kpis?.total_users ?? 0 },
              { label: 'Celebrities',         value: kpis?.total_celebrities ?? 0 },
              { label: 'Fans',                value: kpis?.total_fans ?? 0 },
              { label: 'Conversion rate',     value: `${kpis?.conversion_rate ?? 0}%` },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                <p className="mt-2 font-display text-2xl font-bold text-white">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Revenue chart */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Monthly revenue (last 6 months)</p>
              {monthly.length > 0 ? (
                <>
                  <BarChart data={monthly} valueKey="net" labelKey="month" colorClass="bg-amber/70" />
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    {monthly.map((m) => (
                      <div key={m.month} className="text-center">
                        <div className="text-slate-500">{m.month.replace(' 20', " '")}</div>
                        <div className="text-emerald-400">${m.net.toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-sm text-slate-500">No data yet.</p>}
            </div>

            {/* User growth chart */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">New users per month</p>
              {monthly.length > 0 ? (
                <>
                  <BarChart data={monthly} valueKey="new_fans" labelKey="month" colorClass="bg-blue-500/60" />
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    {monthly.map((m) => (
                      <div key={m.month} className="text-center">
                        <div className="text-slate-500">{m.month.replace(' 20', " '")}</div>
                        <div className="text-blue-400">{m.new_fans + m.new_celebrities} new</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-sm text-slate-500">No data yet.</p>}
            </div>
          </div>

          {/* Orders by status + Top categories */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Orders by status */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Orders by status</p>
              {totalOrdersCount > 0 ? (
                <div className="space-y-2.5">
                  {Object.entries(ordersByStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-24 text-xs text-slate-400 capitalize">{status}</span>
                      <div className="flex-1 rounded-full bg-white/[0.05] h-2">
                        <div
                          className={`h-2 rounded-full ${statusColors[status] ?? 'bg-slate-500'}`}
                          style={{ width: `${(count / totalOrdersCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-slate-400">{count}</span>
                      <span className="w-10 text-right text-xs text-slate-600">{((count / totalOrdersCount) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">No orders yet.</p>}
            </div>

            {/* Top categories */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Top categories by revenue</p>
              {(data?.top_categories ?? []).length > 0 ? (
                <div className="space-y-2.5">
                  {(data?.top_categories ?? []).map((cat, i) => (
                    <div key={cat.category ?? i} className="flex items-center gap-3">
                      <span className="w-28 truncate text-xs text-slate-400 capitalize">{cat.category ?? 'Uncategorised'}</span>
                      <div className="flex-1 rounded-full bg-white/[0.05] h-2">
                        <div
                          className="h-2 rounded-full bg-amber/60"
                          style={{ width: `${(parseFloat(cat.revenue) / parseFloat((data?.top_categories ?? [])[0]?.revenue ?? '1')) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs text-slate-400">${parseFloat(cat.revenue).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">No data yet.</p>}
            </div>
          </div>

          {/* Top celebrities table */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Top celebrities by revenue</p>
            {(data?.top_celebrities ?? []).length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] text-left">
                    <th className="pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">#</th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Celebrity</th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Completed orders</th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {(data?.top_celebrities ?? []).map((celeb, i) => (
                    <tr key={celeb.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-3 text-slate-600 font-bold">{i + 1}</td>
                      <td className="py-2.5">
                        <div className="font-semibold text-white">{celeb.stage_name}</div>
                        <div className="text-xs text-slate-500">{celeb.user?.email ?? ''}</div>
                      </td>
                      <td className="py-2.5 text-slate-300">{celeb.completed_orders}</td>
                      <td className="py-2.5 font-bold text-amber">${parseFloat(celeb.total_revenue ?? '0').toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-slate-500">No data yet.</p>}
          </div>
        </div>
      )}
    </DashShell>
  )
}
