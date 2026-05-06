'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

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

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: 'A' },
  { href: '/admin/users', label: 'Users', icon: 'U' },
  { href: '/admin/orders', label: 'Orders', icon: 'O' },
  { href: '/admin/reports', label: 'Reports', icon: 'R' },
  { href: '/admin/control', label: 'Control', icon: 'C' },
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
      if (!token) {
        router.replace('/login')
        return
      }

      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') {
          if (me.data.user_type === 'celebrity') {
            router.replace('/celebrity/dashboard')
          } else {
            router.replace('/fan/dashboard')
          }
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

  const adminName = user?.email ?? 'Admin'

  return (
    <DashShell navItems={navItems} userName={adminName} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold text-white">Admin Dashboard</h1>
            <div className="flex gap-2">
              <Link href="/admin/reports" className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-[#07161e]">
                Analytics
              </Link>
              <Link href="/admin/control" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white">
                Control Center
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total users', value: overview?.stats.users_total ?? 0, icon: 'U' },
              { label: 'Orders', value: overview?.stats.orders_total ?? 0, icon: 'O' },
              { label: 'Subscription chats', value: overview?.stats.conversations_total ?? 0, icon: 'C' },
              { label: 'Net revenue', value: `$${(overview?.stats.net_revenue ?? 0).toFixed(2)}`, icon: '$' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{item.label}</p>
                <p className="mt-2 font-display text-3xl font-bold text-white">{item.value}</p>
                <p className="mt-1 text-sm text-slate-500">{item.icon}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">System monitoring</p>
              <p className="mt-3 text-sm text-slate-300">Environment: {monitoring?.system.app_env ?? 'n/a'}</p>
              <p className="text-sm text-slate-300">PHP: {monitoring?.system.php_version ?? 'n/a'}</p>
              <p className="text-sm text-slate-300">Laravel: {monitoring?.system.laravel_version ?? 'n/a'}</p>
              <p className="text-sm text-slate-300">Database: {monitoring?.health.database_ok ? 'Healthy' : 'Issue detected'}</p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Role split</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                  <p className="text-slate-500">Admins</p>
                  <p className="font-display text-xl font-bold text-white">{overview?.stats.users_by_type.admin ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                  <p className="text-slate-500">Creators</p>
                  <p className="font-display text-xl font-bold text-white">{overview?.stats.users_by_type.celebrity ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                  <p className="text-slate-500">Fans</p>
                  <p className="font-display text-xl font-bold text-white">{overview?.stats.users_by_type.fan ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashShell>
  )
}
