'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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

const CATEGORIES = ['All', 'Music', 'Sports', 'Acting', 'Comedy', 'Gaming', 'Fashion', 'Podcasting', 'Business', 'Art']

const gradients = [
  'from-rose-500 to-pink-600',
  'from-amber to-orange-500',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-teal-600',
  'from-emerald-500 to-green-600',
  'from-blue-500 to-indigo-600',
  'from-mint to-cyan-500',
]

type Celebrity = {
  id: number
  stage_name: string
  category: string
  bio: string | null
  is_verified: boolean
  min_price: string | null
  average_rating: number | string | null
  total_reviews: number
  avatar_url: string | null
}

type CelebListPayload = { celebrities: { data: Celebrity[]; total: number; last_page: number } }

const fmt = (v: string | null) =>
  v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(v)) : null

const fmtRating = (v: number | string | null) => {
  if (v === null || v === '') return null

  const parsed = Number(v)
  return Number.isFinite(parsed) ? parsed.toFixed(1) : null
}

export default function FanExplorePage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [fetchingMore, setFetchingMore] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('popular')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    api.get<AuthUser>('/auth/me').then((r) => {
      if (r.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
      setUser(r.data)
    }).catch(() => router.replace('/login'))
  }, [router])

  const loadCelebrities = async (q: string, cat: string, sort: string, pg: number, append = false) => {
    if (pg === 1) setLoading(true); else setFetchingMore(true)
    try {
      const params: Record<string, string> = { page: String(pg), per_page: '12', sort }
      if (q) params.search = q
      if (cat !== 'All') params.category = cat
      const res = await api.get<CelebListPayload>('/celebrities', { params })
      const d = res.data.celebrities
      setCelebrities(prev => append ? [...prev, ...d.data] : d.data)
      setTotal(d.total)
      setLastPage(d.last_page)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
      setFetchingMore(false)
    }
  }

  useEffect(() => {
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void loadCelebrities(search, category, sortBy, 1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sortBy])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    void loadCelebrities(search, category, sortBy, next, true)
  }

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Explore Creators</h1>
        <p className="mt-1 text-sm text-slate-400">{total > 0 ? `${total} verified talent${total !== 1 ? 's' : ''} available` : 'Discover your next favourite creator'}</p>
      </div>

      {/* Search + Sort */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by name, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#050f17] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-mint/50 focus:ring-2 focus:ring-mint/10"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#050f17] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-mint/50"
        >
          <option value="popular">Most Popular</option>
          <option value="rating">Top Rated</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Category chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              category === cat
                ? 'bg-mint text-[#030d13]'
                : 'border border-white/10 bg-white/[0.04] text-slate-400 hover:border-mint/30 hover:text-mint-soft'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-white/10" />
              <div className="mx-auto mb-2 h-4 w-24 rounded bg-white/10" />
              <div className="mx-auto h-3 w-16 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : celebrities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-5xl">🔍</span>
          <p className="text-lg font-semibold text-white">No creators found</p>
          <p className="mt-1 text-sm text-slate-500">Try a different search or category</p>
          <button onClick={() => { setSearch(''); setCategory('All') }} className="mt-4 rounded-xl border border-mint/30 px-5 py-2 text-sm text-mint-soft hover:bg-mint/10">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {celebrities.map((celeb, i) => {
              const gradient = gradients[i % gradients.length]
              const initials = celeb.stage_name.slice(0, 2).toUpperCase()
              const price = fmt(celeb.min_price)
              const rating = fmtRating(celeb.average_rating)
              return (
                <Link
                  key={celeb.id}
                  href={`/celebrity?id=${celeb.id}`}
                  className="group flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 transition hover:border-mint/20 hover:bg-white/[0.05] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                >
                  {/* Avatar */}
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-xl font-bold text-white shadow-lg" style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}>
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xl font-bold text-white`}>
                      {initials}
                    </div>
                  </div>

                  {/* Name + verified */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="font-display text-sm font-bold text-white group-hover:text-mint-soft transition">{celeb.stage_name}</p>
                      {celeb.is_verified && <span className="text-xs text-amber" title="Verified">✓</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{celeb.category}</p>
                  </div>

                  {/* Rating */}
                  {rating && (
                    <div className="mt-3 flex items-center justify-center gap-1">
                      <span className="text-xs text-amber">★</span>
                      <span className="text-xs font-semibold text-white">{rating}</span>
                      <span className="text-[10px] text-slate-600">({celeb.total_reviews})</span>
                    </div>
                  )}

                  {/* Bio */}
                  {celeb.bio && (
                    <p className="mt-3 line-clamp-2 text-center text-[11px] leading-relaxed text-slate-500">{celeb.bio}</p>
                  )}

                  {/* Price + CTA */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
                    <span className="text-xs text-slate-500">
                      {price ? <><span className="font-semibold text-white">{price}</span> <span className="text-[10px]">/ service</span></> : 'View pricing'}
                    </span>
                    <span className="rounded-lg bg-mint/10 px-2.5 py-1 text-[11px] font-semibold text-mint-soft transition group-hover:bg-mint/20">
                      Book →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Load more */}
          {page < lastPage && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
                disabled={fetchingMore}
                className="btn-outline rounded-xl px-8 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {fetchingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </DashShell>
  )
}
