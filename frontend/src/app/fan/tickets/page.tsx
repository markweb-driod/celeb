'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api } from '../../lib/api'
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

type Ticket = {
  id: number
  title: string
  artist: string
  date: string
  venue: string
  city: string
  image: string
  gradient: string
  tiers: { name: string; price: number; available: number }[]
  tag?: string
}

const EVENTS: Ticket[] = [
  {
    id: 1, title: 'Neon Nights World Tour', artist: 'DJ Neon', date: '2026-06-14', venue: 'Madison Square Garden', city: 'New York, USA',
    image: '🎶', gradient: 'from-cyan-500 to-teal-600',
    tiers: [{ name: 'GA', price: 79, available: 340 }, { name: 'VIP Floor', price: 149, available: 60 }, { name: 'Platinum', price: 299, available: 12 }],
    tag: 'Selling Fast',
  },
  {
    id: 2, title: 'Luna Live — Starlight Sessions', artist: 'Luna Kira', date: '2026-07-04', venue: 'O2 Arena', city: 'London, UK',
    image: '🌙', gradient: 'from-rose-500 to-pink-600',
    tiers: [{ name: 'Standard', price: 65, available: 800 }, { name: 'Premium', price: 130, available: 150 }, { name: 'Front Row', price: 250, available: 20 }],
    tag: 'New Date Added',
  },
  {
    id: 3, title: 'Comedy Chaos Tour', artist: 'Jake Blaze', date: '2026-06-28', venue: 'Sydney Opera House', city: 'Sydney, AUS',
    image: '😂', gradient: 'from-amber to-orange-500',
    tiers: [{ name: 'Standard', price: 55, available: 500 }, { name: 'VIP', price: 120, available: 80 }],
    tag: undefined,
  },
  {
    id: 4, title: 'Zara Voss — An Evening With', artist: 'Zara Voss', date: '2026-08-10', venue: 'Dolby Theatre', city: 'Los Angeles, USA',
    image: '🎭', gradient: 'from-violet-500 to-purple-600',
    tiers: [{ name: 'Standard', price: 95, available: 200 }, { name: 'VIP', price: 195, available: 30 }, { name: 'Backstage', price: 450, available: 5 }],
    tag: 'Limited',
  },
  {
    id: 5, title: 'Marcus J — Charity Slam Dunk', artist: 'Marcus J', date: '2026-09-03', venue: 'United Center', city: 'Chicago, USA',
    image: '🏀', gradient: 'from-emerald-500 to-green-600',
    tiers: [{ name: 'Bleachers', price: 45, available: 1200 }, { name: 'Courtside', price: 350, available: 40 }],
    tag: 'Charity Event',
  },
  {
    id: 6, title: 'GameCon Fan Meet — Creator Stage', artist: 'StreamKing', date: '2026-07-19', venue: 'ExCeL London', city: 'London, UK',
    image: '🎮', gradient: 'from-indigo-500 to-blue-600',
    tiers: [{ name: 'Day Pass', price: 35, available: 2000 }, { name: 'All-Access', price: 85, available: 300 }, { name: 'VIP Meet & Greet', price: 175, available: 50 }],
    tag: undefined,
  },
]

const CATEGORIES_FILTER = ['All', 'Music', 'Comedy', 'Sports', 'Film & TV', 'Gaming']

export default function FanTicketsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [tierIdx, setTierIdx] = useState(0)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    api.get<AuthUser>('/auth/me').then((r) => {
      if (r.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
      setUser(r.data)
    }).catch(() => router.replace('/login')).finally(() => setLoading(false))
  }, [router])

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'

  const filtered = EVENTS.filter(e => {
    const matchesSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.artist.toLowerCase().includes(search.toLowerCase()) || e.city.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const openModal = (ticket: Ticket) => {
    setSelected(ticket)
    setTierIdx(0)
    setQty(1)
  }

  if (loading) return (
    <DashShell navItems={navItems} userName="…" roleLabel="Fan" accentColor="mint">
      <div className="flex items-center justify-center py-20"><span className="text-slate-500">Loading…</span></div>
    </DashShell>
  )

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      {/* Ticket purchase modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#071e29] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`-mx-6 -mt-6 mb-6 flex items-center gap-4 rounded-t-2xl bg-gradient-to-r ${selected.gradient} px-6 py-5`}>
              <span className="text-3xl">{selected.image}</span>
              <div>
                <p className="font-display text-lg font-bold text-white">{selected.title}</p>
                <p className="text-sm text-white/70">{selected.artist} · {selected.city}</p>
              </div>
            </div>

            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">Date & Venue</p>
            <p className="mb-5 text-sm text-white">
              {new Date(selected.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — {selected.venue}
            </p>

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Select Tier</p>
            <div className="mb-5 space-y-2">
              {selected.tiers.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => setTierIdx(i)}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                    tierIdx === i ? 'border-mint/50 bg-mint/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="font-semibold">{t.name}</span>
                  <div className="text-right">
                    <p className="font-bold text-white">${t.price}</p>
                    <p className="text-[10px] text-slate-500">{t.available} left</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mb-6 flex items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Qty</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white hover:bg-white/10">−</button>
                <span className="w-6 text-center text-sm font-bold text-white">{qty}</span>
                <button onClick={() => setQty(q => Math.min(10, q + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white hover:bg-white/10">+</button>
              </div>
              <p className="ml-auto text-lg font-extrabold text-white">${(selected.tiers[tierIdx].price * qty).toFixed(2)}</p>
            </div>

            <Link
              href={`/fan/checkout?type=ticket&id=${selected.id}&title=${encodeURIComponent(selected.title)}&tier=${encodeURIComponent(selected.tiers[tierIdx].name)}&amount=${selected.tiers[tierIdx].price * qty}&currency=USD`}
              className="btn-primary block w-full rounded-xl py-3.5 text-center text-sm font-bold"
            >
              Proceed to Checkout →
            </Link>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Concert & Event Tickets</h1>
        <p className="mt-1 text-sm text-slate-400">Live shows, meet-and-greets, and exclusive fan events</p>
      </div>

      {/* Search + filter */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, artists, cities…" className="w-full rounded-xl border border-white/10 bg-[#050f17] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10" />
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES_FILTER.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === c ? 'bg-mint text-[#030d13]' : 'border border-white/10 bg-white/[0.04] text-slate-400 hover:border-mint/30 hover:text-mint-soft'}`}>{c}</button>
        ))}
      </div>

      {/* My tickets banner */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-amber/20 bg-amber/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎟️</span>
          <p className="text-sm text-slate-300">Your purchased tickets appear in <span className="font-semibold text-white">My Bookings</span></p>
        </div>
        <Link href="/fan/orders" className="text-xs text-amber hover:text-amber-lt">View →</Link>
      </div>

      {/* Events grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-4xl">🎟️</span>
          <p className="text-lg font-semibold text-white">No events found</p>
          <button onClick={() => setSearch('')} className="mt-3 text-sm text-mint-soft hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(event => (
            <div key={event.id} className="group flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden hover:border-mint/20 transition">
              {/* Event banner */}
              <div className={`flex items-center gap-3 bg-gradient-to-r ${event.gradient} px-5 py-4`}>
                <span className="text-2xl">{event.image}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-display text-sm font-bold text-white">{event.title}</p>
                  <p className="text-[11px] text-white/70">{event.artist}</p>
                </div>
                {event.tag && <span className="flex-shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">{event.tag}</span>}
              </div>

              <div className="flex flex-1 flex-col p-5">
                {/* Date + venue */}
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>📅</span>
                    <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>📍</span>
                    <span className="truncate">{event.venue}, {event.city}</span>
                  </div>
                </div>

                {/* Price range */}
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">From</span>
                  <span className="font-display text-lg font-bold text-white">${Math.min(...event.tiers.map(t => t.price))}</span>
                </div>

                {/* Tier pills */}
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {event.tiers.map(t => (
                    <span key={t.name} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${t.available < 30 ? 'border border-red-500/30 bg-red-500/10 text-red-300' : 'border border-white/10 bg-white/[0.04] text-slate-400'}`}>
                      {t.name} — {t.available < 30 ? `${t.available} left` : 'Available'}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => openModal(event)}
                  className="btn-primary mt-auto w-full rounded-xl py-2.5 text-sm font-bold"
                >
                  Get Tickets
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashShell>
  )
}
