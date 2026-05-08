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
  { href: '/fan/orders',          label: 'My Bookings',     icon: '📦' },
  { href: '/fan/subscriptions',   label: 'Subscriptions',   icon: '⭐' },
  { href: '/fan/chat',            label: 'Chat',            icon: '💬' },
  { href: '/fan/tickets',         label: 'Tickets',         icon: '🎟️' },
  { href: '/fan/merch',           label: 'Merch Store',     icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault',           label: 'My Vault',        icon: '🔒' },
  { href: '/fan/profile',         label: 'Profile',         icon: '👤' },
]

export default function FanTicketsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    api.get<AuthUser>('/auth/me').then((r) => {
      if (r.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
      setUser(r.data)
    }).catch(() => router.replace('/login')).finally(() => setLoading(false))
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
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Concert &amp; Event Tickets</h1>
        <p className="mt-1 text-sm text-slate-400">Live shows, meet-and-greets, and exclusive fan events</p>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-white/10 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 text-4xl ring-1 ring-violet-500/20">
          🎟️
        </div>
        <div>
          <p className="font-display text-lg font-bold text-white">Event Tickets Coming Soon</p>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Live events and concerts will be listed here once celebrities publish their schedules. Stay tuned!
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/fan/explore"
            className="rounded-xl border border-mint/30 px-6 py-2.5 text-sm font-semibold text-mint-soft transition hover:bg-mint/10"
          >
            Browse Creators →
          </Link>
          <Link
            href="/fan/orders"
            className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            My Bookings
          </Link>
        </div>
      </div>
    </DashShell>
  )
}