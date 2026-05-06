'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type Service = {
  id: number
  title: string
  service_type: string
  description: string
  base_price: string
  currency: string
  status: 'draft' | 'active' | 'paused' | string
  total_sold: number
  requires_booking: boolean
  is_digital: boolean
  created_at: string
}

type ServicesPayload = { services: Service[] }

const navItems = [
  { href: '/celebrity/dashboard', label: 'Overview', icon: 'OV' },
  { href: '/celebrity/services', label: 'Services', icon: 'SV' },
  { href: '/celebrity/orders', label: 'Orders', icon: 'OR' },
  { href: '/celebrity/earnings', label: 'Earnings', icon: 'EC' },
  { href: '/celebrity/chat',      label: 'Fan Chat',   icon: 'CH' },
  { href: '/celebrity/profile', label: 'Profile', icon: 'PR' },
]

const statusMeta: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
  draft: { label: 'Draft', cls: 'border-amber/30 bg-amber/10 text-amber' },
  paused: { label: 'Paused', cls: 'border-slate-400/30 bg-slate-500/10 text-slate-300' },
}

const formatMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(amount || 0))

export default function CelebrityServicesPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    try {
      const me = await api.get<AuthUser>('/auth/me')
      if (me.data.user_type !== 'celebrity') {
        router.replace('/fan/dashboard')
        return
      }
      setUser(me.data)

      const res = await api.get<ServicesPayload>('/celebrity/services')
      setServices(res.data.services ?? [])
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      router.replace('/login')
      return
    }
    void loadData()
  }, [router])

  const activeCount = useMemo(() => services.filter((s) => s.status === 'active').length, [services])
  const pausedCount = useMemo(() => services.filter((s) => s.status === 'paused').length, [services])
  const totalSold = useMemo(() => services.reduce((sum, s) => sum + Number(s.total_sold ?? 0), 0), [services])

  const updateStatus = async (service: Service, nextStatus: 'active' | 'paused') => {
    try {
      await api.put(`/celebrity/services/${service.id}`, { status: nextStatus })
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, status: nextStatus } : s)))
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  const deleteService = async (serviceId: number) => {
    try {
      await api.delete(`/celebrity/services/${serviceId}`)
      setServices((prev) => prev.filter((s) => s.id !== serviceId))
    } catch (e) {
      setError(getApiErrorMessage(e))
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber">Service studio</p>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Manage your services</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadData(true)}
                className="btn-outline rounded-xl px-4 py-2 text-sm font-semibold"
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <Link
                href="/celebrity/services/new"
                className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-[#07161e] transition hover:bg-amber-lt"
              >
                + New service
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: 'Total services', value: services.length, icon: 'SV', color: 'from-amber/20 to-orange-600/10' },
              { label: 'Active', value: activeCount, icon: 'OK', color: 'from-emerald-500/20 to-green-600/10' },
              { label: 'Paused', value: pausedCount, icon: 'II', color: 'from-slate-500/20 to-slate-700/10' },
              { label: 'Total sold', value: totalSold, icon: 'SL', color: 'from-violet-500/20 to-purple-600/10' },
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

          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-display text-sm font-bold text-white">All Services</h2>
              <span className="text-xs text-slate-600">{services.length} total</span>
            </div>

            {services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="mb-3 text-4xl">SV</span>
                <p className="font-display text-sm font-semibold text-white">No services yet</p>
                <p className="mt-1 text-xs text-slate-600">Create your first service to start earning</p>
                <Link href="/celebrity/services/new" className="mt-4 rounded-xl bg-amber px-5 py-2 text-xs font-bold text-[#07161e]">
                  Create service &rarr;
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {services.map((service) => {
                  const meta = statusMeta[service.status] ?? statusMeta.draft
                  return (
                    <div key={service.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{service.title}</p>
                          <p className="mt-0.5 text-[11px] capitalize text-slate-500">{service.service_type.replaceAll('_', ' ')}</p>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{service.description}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                            <span>{service.requires_booking ? 'Requires booking' : 'Instant delivery'}</span>
                            <span>|</span>
                            <span>{service.is_digital ? 'Digital' : 'Physical'}</span>
                            <span>|</span>
                            <span>{service.total_sold} sold</span>
                          </div>
                        </div>

                        <div className="flex min-w-[220px] flex-col items-end gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.cls}`}>
                            {meta.label}
                          </span>
                          <span className="gradient-text-amber text-base font-bold">
                            {formatMoney(service.base_price, service.currency)}
                          </span>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void updateStatus(service, service.status === 'active' ? 'paused' : 'active')}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                            >
                              {service.status === 'active' ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this service? This cannot be undone.')) {
                                  void deleteService(service.id)
                                }
                              }}
                              className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition hover:border-red-400/30"
                            >
                              Delete
                            </button>
                          </div>
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

