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

const VAULT_CATEGORIES = ['All', 'Videos', 'Audio', 'Photos', 'Documents'] as const
type VaultCategory = typeof VAULT_CATEGORIES[number]

const CATEGORY_ICONS: Record<VaultCategory, string> = {
  All: '🔒', Videos: '🎬', Audio: '🎵', Photos: '🖼️', Documents: '📄',
}

export default function FanVaultPage() {
  const router = useRouter()
  const [user, setUser]         = useState<AuthUser | null>(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<VaultCategory>('All')

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    api.get<AuthUser>('/auth/me')
      .then((r) => {
        if (r.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
        setUser(r.data)
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'

  if (loading) return (
    <DashShell navItems={navItems} userName="…" roleLabel="Fan" accentColor="mint">
      <div className="flex h-48 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
      </div>
    </DashShell>
  )

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">My Vault</h1>
            <p className="mt-1 text-sm text-slate-400">Exclusive content from creators you support</p>
          </div>
          <Link href="/fan/subscriptions" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:border-mint/30 hover:text-mint-soft">
            Manage subscriptions →
          </Link>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {VAULT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === cat
                  ? 'bg-mint text-[#07161e]'
                  : 'border border-white/10 text-slate-400 hover:border-mint/30 hover:text-mint-soft'
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {cat}
            </button>
          ))}
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-mint/20 to-teal-600/10 text-4xl ring-1 ring-mint/20">
            🔒
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">Your vault is empty</p>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Subscribe to a creator to unlock exclusive videos, audio drops, photos, and more — all stored here just for you.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/fan/subscriptions" className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">
              Browse subscription plans
            </Link>
            <Link href="/fan/explore" className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white">
              Explore creators
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5 sm:p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">How the Vault works</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: '⭐', title: 'Subscribe to a creator', desc: 'Choose a tier that unlocks exclusive content drops.' },
              { icon: '🔔', title: 'Get notified',           desc: 'Receive alerts the moment new content is published for subscribers.' },
              { icon: '🔒', title: 'Stored here forever',    desc: 'All content you unlock is saved in your Vault permanently.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex-shrink-0 text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashShell>
  )
}
