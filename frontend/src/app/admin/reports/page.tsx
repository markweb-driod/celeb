'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type ReportsResponse = {
  monthly_revenue: Array<{ month: string; payments: number; refunds: number; net: number }>
  top_creators: Array<{ id: number; stage_name: string; email: string | null; completed_orders: number; completed_revenue: number }>
}

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: 'A' },
  { href: '/admin/users', label: 'Users', icon: 'U' },
  { href: '/admin/orders', label: 'Orders', icon: 'O' },
  { href: '/admin/reports', label: 'Reports', icon: 'R' },
  { href: '/admin/control', label: 'Control', icon: 'C' },
]

export default function AdminReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [monthly, setMonthly] = useState<ReportsResponse['monthly_revenue']>([])
  const [creators, setCreators] = useState<ReportsResponse['top_creators']>([])
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
          router.replace('/dashboard')
          return
        }
        setUser(me.data)

        const res = await api.get<ReportsResponse>('/admin/overview')
        setMonthly(res.data.monthly_revenue)
        setCreators(res.data.top_creators)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  return (
    <DashShell navItems={navItems} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-white">Reports</h1>

          <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Monthly net revenue</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {monthly.map((item) => (
                <div key={item.month} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="text-xs text-slate-500">{item.month}</p>
                  <p className="mt-1 font-display text-xl font-bold text-white">${item.net.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">Paid ${item.payments.toFixed(2)} | Refund ${item.refunds.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-white/[0.08] px-4 py-3 text-xs uppercase tracking-widest text-slate-500">
              <p>Creator</p>
              <p>Completed orders</p>
              <p>Revenue</p>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {creators.map((creator) => (
                <div key={creator.id} className="grid grid-cols-[1.2fr_1fr_1fr] items-center px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-white">{creator.stage_name}</p>
                    <p className="text-xs text-slate-500">{creator.email ?? '-'}</p>
                  </div>
                  <p className="text-slate-300">{creator.completed_orders}</p>
                  <p className="font-semibold text-white">${creator.completed_revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashShell>
  )
}
