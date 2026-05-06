'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

const navItems = [
  { href: '/fan/dashboard',     label: 'Overview',       icon: '🏠' },
  { href: '/fan/explore',       label: 'Explore',        icon: '🔍' },
  { href: '/fan/orders',        label: 'My Bookings',    icon: '📦' },
  { href: '/fan/subscriptions', label: 'Subscriptions',  icon: '⭐' },
  { href: '/fan/chat',          label: 'Chat',           icon: '💬' },
  { href: '/fan/tickets',       label: 'Tickets',        icon: '🎟️' },
  { href: '/fan/merch',         label: 'Merch Store',    icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault',         label: 'My Vault',       icon: '🔒' },
  { href: '/fan/profile',       label: 'Profile',        icon: '👤' },
]

type Tier = { id: string; name: string; price: number; currency: string; perks: string[]; accent: string }
type ActiveSub = { id: number; celebrity: string; tier: string; renewsAt: string; gradient: string }

const MOCK_ACTIVE: ActiveSub[] = [
  { id: 1, celebrity: 'Luna Kira', tier: 'VIP Fan', renewsAt: '2026-06-01', gradient: 'from-rose-500 to-pink-600' },
  { id: 2, celebrity: 'Marcus J',  tier: 'Premium',  renewsAt: '2026-05-22', gradient: 'from-amber to-orange-500' },
]

const FEATURED_CELEBS = [
  {
    id: 1, name: 'Zara Voss', category: 'Actor', initials: 'ZV', gradient: 'from-violet-500 to-purple-600',
    tiers: [
      { id: 'fan',     name: 'Fan',     price: 9,   currency: 'USD', perks: ['Monthly exclusive video', 'Access to fan-only posts', 'Digital autograph'],                   accent: 'border-slate-500/30 bg-slate-500/10 text-slate-300' },
      { id: 'premium', name: 'Premium', price: 24,  currency: 'USD', perks: ['All Fan perks', 'Weekly behind-the-scenes', 'Priority DM queue', '10% booking discount'],    accent: 'border-mint/30 bg-mint/10 text-mint-soft' },
      { id: 'vip',     name: 'VIP',     price: 59,  currency: 'USD', perks: ['All Premium perks', 'Monthly 1-on-1 call (15 min)', 'Exclusive merch drops', '25% discount'], accent: 'border-amber/30 bg-amber/10 text-amber' },
    ] as Tier[],
  },
  {
    id: 2, name: 'DJ Neon', category: 'Music Artist', initials: 'DN', gradient: 'from-cyan-500 to-teal-600',
    tiers: [
      { id: 'fan',     name: 'Fan',     price: 7,   currency: 'USD', perks: ['Exclusive audio drops', 'Fan community access', 'Monthly wallpapers'],                        accent: 'border-slate-500/30 bg-slate-500/10 text-slate-300' },
      { id: 'premium', name: 'Premium', price: 19,  currency: 'USD', perks: ['All Fan perks', 'Early concert ticket access', 'Unreleased track previews'],                  accent: 'border-mint/30 bg-mint/10 text-mint-soft' },
      { id: 'vip',     name: 'VIP',     price: 49,  currency: 'USD', perks: ['All Premium perks', 'Backstage pass lottery', 'Signed collectible', 'Producer credit'],       accent: 'border-amber/30 bg-amber/10 text-amber' },
    ] as Tier[],
  },
]

export default function FanSubscriptionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [activeSubs, setActiveSubs] = useState<ActiveSub[]>(MOCK_ACTIVE)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    api.get<AuthUser>('/auth/me').then((r) => {
      if (r.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
      setUser(r.data)
    }).catch(() => router.replace('/login')).finally(() => setLoading(false))
  }, [router])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSubscribe = async (celebName: string, tier: Tier) => {
    const key = `${celebName}-${tier.id}`
    setSubscribing(key)
    await new Promise(r => setTimeout(r, 900))
    setSubscribing(null)
    showToast(`✅ Subscribed to ${celebName} — ${tier.name} tier!`)
  }

  const handleCancel = (id: number) => {
    setActiveSubs(prev => prev.filter(s => s.id !== id))
    setCancelId(null)
    showToast('Subscription cancelled.')
  }

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'

  if (loading) return (
    <DashShell navItems={navItems} userName="…" roleLabel="Fan" accentColor="mint">
      <div className="flex items-center justify-center py-20"><span className="text-slate-500">Loading…</span></div>
    </DashShell>
  )

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-mint/30 bg-[#071e29] px-5 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

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
      {activeSubs.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Active Subscriptions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSubs.map(sub => (
              <div key={sub.id} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${sub.gradient} text-sm font-bold text-white`}>
                  {sub.celebrity.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{sub.celebrity}</p>
                  <p className="text-[11px] text-mint-soft">{sub.tier}</p>
                  <p className="text-[10px] text-slate-600">Renews {new Date(sub.renewsAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setCancelId(sub.id)}
                  className="flex-shrink-0 rounded-lg border border-red-500/20 px-2.5 py-1 text-[10px] text-red-400 transition hover:bg-red-500/10"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cancel confirm modal */}
      {cancelId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCancelId(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#071e29] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-bold text-white">Cancel subscription?</h3>
            <p className="mb-6 text-sm text-slate-400">You&apos;ll lose access at the end of your current billing cycle.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelId(null)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:text-white">Keep it</button>
              <button onClick={() => handleCancel(cancelId)} className="flex-1 rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold text-white hover:bg-red-500">Cancel plan</button>
            </div>
          </div>
        </div>
      )}

      {/* Featured plans */}
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Featured Creator Plans</h2>
      <div className="space-y-8">
        {FEATURED_CELEBS.map(celeb => (
          <div key={celeb.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
            {/* Creator header */}
            <div className="mb-6 flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${celeb.gradient} text-base font-bold text-white`}>
                {celeb.initials}
              </div>
              <div>
                <p className="font-display text-base font-bold text-white">{celeb.name}</p>
                <p className="text-xs text-slate-500">{celeb.category}</p>
              </div>
              <Link href={`/celebrity?id=${celeb.id}`} className="ml-auto text-xs text-slate-500 hover:text-mint-soft transition">
                View profile →
              </Link>
            </div>

            {/* Tiers */}
            <div className="grid gap-4 sm:grid-cols-3">
              {celeb.tiers.map(tier => {
                const isActive = activeSubs.some(s => s.celebrity === celeb.name && s.tier === tier.name)
                const key = `${celeb.name}-${tier.id}`
                return (
                  <div key={tier.id} className={`relative flex flex-col rounded-xl border p-4 ${tier.accent}`}>
                    {tier.id === 'vip' && (
                      <span className="absolute -top-2.5 left-4 rounded-full bg-amber px-2.5 py-0.5 text-[10px] font-bold text-[#07161e]">BEST VALUE</span>
                    )}
                    <p className="mb-0.5 text-sm font-bold">{tier.name}</p>
                    <p className="mb-4 text-2xl font-extrabold text-white">
                      ${tier.price}<span className="text-xs font-normal text-slate-500">/mo</span>
                    </p>
                    <ul className="mb-5 flex-1 space-y-1.5">
                      {tier.perks.map(p => (
                        <li key={p} className="flex items-start gap-2 text-[11px] text-slate-300">
                          <span className="mt-0.5 text-mint">✓</span>{p}
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={isActive || subscribing === key}
                      onClick={() => handleSubscribe(celeb.name, tier)}
                      className={`w-full rounded-xl py-2.5 text-xs font-bold transition ${
                        isActive
                          ? 'bg-mint/20 text-mint-soft cursor-default'
                          : 'btn-primary hover:opacity-90'
                      }`}
                    >
                      {isActive ? '✓ Subscribed' : subscribing === key ? 'Processing…' : `Subscribe $${tier.price}/mo`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state CTA */}
      <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <span className="mb-3 block text-3xl">⭐</span>
        <p className="text-sm font-semibold text-white">More creators coming soon</p>
        <p className="mt-1 text-xs text-slate-500">Browse all creators and check their subscription plans on their profile</p>
        <Link href="/fan/explore" className="mt-4 inline-block rounded-xl bg-mint/10 px-5 py-2 text-sm font-semibold text-mint-soft hover:bg-mint/20">
          Explore creators →
        </Link>
      </div>
    </DashShell>
  )
}
