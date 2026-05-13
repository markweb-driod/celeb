'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api } from '../../lib/api'
import { AuthUser } from '../../lib/types'

const navItems = [
  { href: '/fan/dashboard',       label: 'Overview',        icon: '🏠' },
  { href: '/fan/explore',         label: 'Explore',         icon: '🔍' },
  { href: '/fan/cards',           label: 'Fan Cards',       icon: '🃏' },
  { href: '/fan/orders',          label: 'My Bookings',     icon: '📦' },
  { href: '/fan/subscriptions',   label: 'Subscriptions',   icon: '⭐' },
  { href: '/fan/chat',            label: 'Chat',            icon: '💬' },
  { href: '/fan/tickets',         label: 'Tickets',         icon: '🎟️' },
  { href: '/fan/merch',           label: 'Merch Store',     icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault',           label: 'My Vault',        icon: '🔒' },
  { href: '/fan/profile',         label: 'Profile',         icon: '👤' },
]

const GRADIENTS = [
  'from-rose-500 to-pink-600',
  'from-amber to-orange-500',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-teal-600',
  'from-emerald-500 to-green-600',
  'from-blue-500 to-indigo-600',
  'from-mint to-cyan-500',
]

type ActiveSub = {
  order_id: number
  conversation_id: number | null
  celebrity_name: string
  service_title: string
  subscription_price: number
  currency: string
}

type Celebrity = {
  id: number
  stage_name: string
  category: string
  min_price: string | null
  average_rating: number | string | null
  total_reviews: number
}

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)

const getInitials = (name: string) =>
  name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()

export default function FanSubscriptionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSubs, setActiveSubs] = useState<ActiveSub[]>([])
  const [celebrities, setCelebrities] = useState<Celebrity[]>([])

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    const load = async () => {
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
        setUser(me.data)
        const [subsRes, celebsRes] = await Promise.allSettled([
          api.get<{ subscriptions: ActiveSub[] }>('/chat/subscriptions'),
          api.get<{ celebrities: { data: Celebrity[] } }>('/celebrities', { params: { per_page: 8 } }),
        ])
        if (subsRes.status === 'fulfilled') {
          setActiveSubs(subsRes.value.data.subscriptions ?? [])
        }
        if (celebsRes.status === 'fulfilled') {
          setCelebrities(celebsRes.value.data.celebrities?.data ?? [])
        }
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [router])

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'

  if (loading) return (
    <DashShell navItems={navItems} userName="..." roleLabel="Fan" accentColor="mint">
      <div className="flex h-48 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
      </div>
    </DashShell>
  )

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-400">Support your favourite creators with a monthly plan</p>
        </div>
        <Link href="/fan/explore" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:border-mint/30 hover:text-mint-soft">
          + Explore creators
        </Link>
      </div>

      {/* Active subscriptions */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Active Subscriptions
          {activeSubs.length > 0 && (
            <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] text-mint-soft">{activeSubs.length}</span>
          )}
        </h2>
        {activeSubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
            <p className="text-sm text-slate-500">No active subscriptions yet.</p>
            <p className="mt-1 text-xs text-slate-600">Book a membership service from any creator to subscribe.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSubs.map((sub, i) => (
              <div key={sub.order_id} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} text-sm font-bold text-white`}>
                  {getInitials(sub.celebrity_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{sub.celebrity_name}</p>
                  <p className="text-[11px] text-mint-soft">{sub.service_title}</p>
                  <p className="text-[10px] text-slate-600">{fmt(sub.subscription_price, sub.currency)}/mo</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Discover creators */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Discover Creators</h2>
        {celebrities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
            <p className="text-sm text-slate-500">No creators available yet.</p>
            <Link href="/fan/explore" className="mt-3 inline-block text-sm text-mint-soft hover:text-white">
              Browse all →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {celebrities.map((celeb, i) => (
              <div key={celeb.id} className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} text-base font-bold text-white`}>
                  {getInitials(celeb.stage_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-bold text-white">{celeb.stage_name}</p>
                  <p className="text-xs text-slate-500">{celeb.category}</p>
                  {celeb.min_price && (
                    <p className="mt-0.5 text-xs text-mint-soft">from {fmt(Number(celeb.min_price))}/session</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {Number(celeb.average_rating) > 0 && (
                    <span className="text-[11px] text-amber">★ {Number(celeb.average_rating).toFixed(1)}</span>
                  )}
                  <Link
                    href={`/celebrity?id=${celeb.id}`}
                    className="rounded-xl border border-mint/30 px-4 py-1.5 text-xs font-semibold text-mint-soft transition hover:bg-mint/10"
                  >
                    View Plans →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashShell>
  )
}