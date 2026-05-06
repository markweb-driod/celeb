'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

type OverviewResponse = {
  stats: {
    users_total: number
    users_by_type: { admin: number; celebrity: number; fan: number }
    users_by_status: { active: number; suspended: number; banned: number }
    orders_total: number
    conversations_total: number
    messages_total: number
    active_subscriptions: number
    net_revenue: number
    platform_fees_collected: number
  }
  monthly_revenue?: Array<{ month: string; net: number }>
  top_creators?: Array<{ id: number; stage_name: string; completed_orders: number; completed_revenue: number }>
}

type MonitoringResponse = {
  system: {
    app_env: string
    php_version: string
    laravel_version: string
    server_time: string
  }
  health: {
    database_ok: boolean
    jobs_pending: number | null
    jobs_failed: number | null
  }
}

const quickLinks = [
  { href: '/admin/celebrities', label: 'Celebrities',  icon: '⭐', desc: 'Verify & manage creators' },
  { href: '/admin/fans',        label: 'Fans',         icon: '🎭', desc: 'Fan accounts & spending' },
  { href: '/admin/payments',    label: 'Payments',     icon: '💳', desc: 'Transactions & payouts' },
  { href: '/admin/analytics',   label: 'Analytics',    icon: '📈', desc: 'Revenue & growth charts' },
  { href: '/admin/audit',       label: 'Audit Log',    icon: '🔍', desc: 'Recent platform activity' },
  { href: '/admin/control',     label: 'Control',      icon: '⚙️', desc: 'Settings & configuration' },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [monitoring, setMonitoring] = useState<MonitoringResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }

      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') {
          router.replace(me.data.user_type === 'celebrity' ? '/celebrity/dashboard' : '/fan/dashboard')
          return
        }
        setUser(me.data)

        const [overviewRes, monitoringRes] = await Promise.all([
          api.get<OverviewResponse>('/admin/overview'),
          api.get<MonitoringResponse>('/admin/monitoring'),
        ])

        setOverview(overviewRes.data)
        setMonitoring(monitoringRes.data)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const s = overview?.stats
  const dbOk = monitoring?.health.database_ok ?? true
  const jobsFailed = monitoring?.health.jobs_failed ?? 0

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="mt-0.5 text-sm text-slate-500">Welcome back, {user?.email ?? 'Admin'}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/analytics" className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-[#07161e]">
                Analytics
              </Link>
              <Link href="/admin/control" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-amber/30">
                Control Center
              </Link>
            </div>
          </div>

          {/* Health alerts */}
          {(!dbOk || (jobsFailed ?? 0) > 0) && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {!dbOk && <p>⚠ Database connectivity issue detected.</p>}
              {(jobsFailed ?? 0) > 0 && <p>⚠ {jobsFailed} failed queue jobs — check the queue worker.</p>}
            </div>
          )}

          {/* Primary KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total users',        value: s?.users_total ?? 0,                                     sub: `${s?.users_by_status.active ?? 0} active`,      color: 'text-white' },
              { label: 'Total orders',        value: s?.orders_total ?? 0,                                    sub: `${s?.active_subscriptions ?? 0} subscriptions`, color: 'text-white' },
              { label: 'Net revenue',         value: `$${(s?.net_revenue ?? 0).toFixed(2)}`,                  sub: 'after refunds',                                  color: 'text-amber' },
              { label: 'Platform fees',       value: `$${(s?.platform_fees_collected ?? 0).toFixed(2)}`,      sub: 'commissions earned',                             color: 'text-emerald-400' },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                <p className={`mt-2 font-display text-3xl font-bold ${card.color}`}>{card.value}</p>
                <p className="mt-1 text-xs text-slate-600">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* User breakdown + system health */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* User role split */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">User breakdown</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Celebrities', count: s?.users_by_type.celebrity ?? 0, color: 'bg-amber/70' },
                  { label: 'Fans',        count: s?.users_by_type.fan ?? 0,       color: 'bg-blue-500/70' },
                  { label: 'Admins',      count: s?.users_by_type.admin ?? 0,     color: 'bg-slate-500/70' },
                ].map((row) => {
                  const total = s?.users_total || 1
                  return (
                    <div key={row.label} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-slate-400">{row.label}</span>
                      <div className="flex-1 rounded-full bg-white/[0.05] h-2">
                        <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${(row.count / total) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs font-semibold text-white">{row.count}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { label: 'Active',    count: s?.users_by_status.active ?? 0,    color: 'text-emerald-400' },
                  { label: 'Suspended', count: s?.users_by_status.suspended ?? 0, color: 'text-amber' },
                  { label: 'Banned',    count: s?.users_by_status.banned ?? 0,    color: 'text-red-400' },
                ].map((row) => (
                  <div key={row.label} className="rounded-xl bg-white/[0.03] py-2">
                    <p className="text-slate-500">{row.label}</p>
                    <p className={`font-bold ${row.color}`}>{row.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Messaging stats */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Messaging</p>
              <div className="space-y-3">
                {[
                  { label: 'Conversations', value: s?.conversations_total ?? 0 },
                  { label: 'Messages',      value: s?.messages_total ?? 0 },
                  { label: 'Active subs',   value: s?.active_subscriptions ?? 0 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{row.label}</span>
                    <span className="font-display text-lg font-bold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
              <Link href="/admin/chats" className="mt-4 flex items-center gap-1 text-xs text-amber hover:underline">
                View chat supervision →
              </Link>
            </div>

            {/* System health */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">System health</p>
              <div className="space-y-2">
                {[
                  { label: 'Environment', value: monitoring?.system.app_env ?? '—' },
                  { label: 'PHP',         value: monitoring?.system.php_version ?? '—' },
                  { label: 'Laravel',     value: monitoring?.system.laravel_version ?? '—' },
                  { label: 'Database',    value: dbOk ? '✓ Healthy' : '✗ Issue', valueColor: dbOk ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Queue jobs pending', value: String(monitoring?.health.jobs_pending ?? 0) },
                  { label: 'Queue jobs failed',  value: String(jobsFailed), valueColor: (jobsFailed ?? 0) > 0 ? 'text-red-400' : undefined },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{row.label}</span>
                    <span className={`text-xs font-medium ${row.valueColor ?? 'text-slate-300'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Quick access</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#071e29]/50 p-4 transition hover:border-amber/20 hover:bg-[#071e29]/80"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{link.label}</p>
                    <p className="text-xs text-slate-500">{link.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top creators preview */}
          {(overview?.top_creators ?? []).length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Top creators</p>
                <Link href="/admin/celebrities" className="text-xs text-amber hover:underline">View all →</Link>
              </div>
              <div className="space-y-2">
                {(overview?.top_creators ?? []).slice(0, 5).map((creator, i) => (
                  <div key={creator.id} className="flex items-center gap-3">
                    <span className="w-5 text-xs text-slate-600 font-bold">{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-300">{creator.stage_name}</span>
                    <span className="text-xs text-slate-500">{creator.completed_orders} orders</span>
                    <span className="text-sm font-semibold text-amber">${(creator.completed_revenue ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashShell>
  )
}
