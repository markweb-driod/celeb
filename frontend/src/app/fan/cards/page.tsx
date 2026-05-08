'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
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

type FanCardService = {
  id: number
  title: string
  description: string | null
  base_price: string
  currency: string
  images: string[] | null
  total_sold: number
  celebrity_profile: {
    id: number
    stage_name: string
    category: string | null
    is_verified: boolean
    avatar_url: string | null
  } | null
}

type ServicePayload = {
  services: {
    data: FanCardService[]
    total: number
    last_page: number
  }
}

const cardGradients = [
  'from-amber/40 via-orange-500/20 to-rose-600/30',
  'from-violet-500/40 via-purple-600/20 to-indigo-600/30',
  'from-cyan-500/40 via-teal-500/20 to-emerald-600/30',
  'from-rose-500/40 via-pink-600/20 to-fuchsia-600/30',
  'from-blue-500/40 via-indigo-500/20 to-violet-600/30',
  'from-emerald-500/40 via-teal-500/20 to-cyan-600/30',
]

const fmt = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 0 }).format(Number(amount))

export default function FanCardsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [cards, setCards] = useState<FanCardService[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [fetchingMore, setFetchingMore] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    api.get<AuthUser>('/auth/me').then((r) => {
      if (r.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
      setUser(r.data)
    }).catch(() => router.replace('/login'))
  }, [router])

  const loadCards = async (q: string, pg: number, append = false) => {
    if (pg === 1) setLoading(true); else setFetchingMore(true)
    try {
      const params: Record<string, string> = {
        service_type: 'fan_card',
        page: String(pg),
        per_page: '12',
      }
      if (q) params.q = q
      const res = await api.get<ServicePayload>('/services', { params })
      const d = res.data.services
      setCards(prev => append ? [...prev, ...d.data] : d.data)
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
    void loadCards('', 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void loadCards(q, 1), 400)
  }

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    void loadCards(search, next, true)
  }

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mint-soft">Collectibles</p>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Fan Cards</h1>
            <p className="mt-1 text-sm text-slate-400">Exclusive digital collectibles from your favourite creators</p>
          </div>
          {total > 0 && (
            <span className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint-soft">
              {total} card{total !== 1 ? 's' : ''} available
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-600">🔍</span>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search fan cards…"
            className="w-full rounded-xl border border-white/[0.07] bg-[#071e29]/60 py-3 pl-9 pr-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-mint/40"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <span className="text-6xl">🃏</span>
            <div>
              <p className="font-display text-lg font-bold text-white">No fan cards yet</p>
              <p className="mt-1 text-sm text-slate-400">
                {search ? 'No cards match your search.' : 'Creators haven\'t published any fan cards yet — check back soon.'}
              </p>
            </div>
            <Link href="/fan/explore" className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">
              Explore creators
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, i) => {
              const grad = cardGradients[i % cardGradients.length]
              const celeb = card.celebrity_profile
              const initials = celeb?.stage_name?.slice(0, 2).toUpperCase() ?? '??'
              return (
                <div
                  key={card.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#071e29]/80 shadow-lg transition hover:-translate-y-0.5 hover:border-mint/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                >
                  {/* Card art area */}
                  <div className={`relative aspect-[3/2] w-full overflow-hidden bg-gradient-to-br ${grad}`}>
                    {card.images?.[0] ? (
                      <img src={card.images[0]} alt={card.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                        <span className="text-5xl opacity-60">🃏</span>
                        <span className="font-display text-xs font-bold uppercase tracking-widest text-white/40">Fan Card</span>
                      </div>
                    )}
                    {/* Holographic shimmer overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    {/* Series badge */}
                    <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                      Fan Card
                    </div>
                    {/* Sold badge */}
                    {card.total_sold > 0 && (
                      <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                        {card.total_sold} owned
                      </div>
                    )}
                  </div>

                  {/* Celebrity identity strip */}
                  {celeb && (
                    <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-4 py-2.5">
                      {celeb.avatar_url ? (
                        <img src={celeb.avatar_url} alt={celeb.stage_name} className="h-7 w-7 rounded-full object-cover ring-1 ring-amber/30" />
                      ) : (
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber/40 to-orange-600/40 font-display text-[11px] font-bold text-white ring-1 ring-amber/20">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">{celeb.stage_name}</p>
                        {celeb.category && <p className="text-[10px] capitalize text-slate-600">{celeb.category}</p>}
                      </div>
                      {celeb.is_verified && (
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber text-[8px] font-bold text-[#07161e]">✓</span>
                      )}
                    </div>
                  )}

                  {/* Card info */}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display text-sm font-bold text-white">{card.title}</h3>
                    {card.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{card.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <p className="gradient-text-amber font-display text-lg font-bold">{fmt(card.base_price, card.currency)}</p>
                      <Link
                        href={`/book?id=${card.id}`}
                        className="rounded-xl bg-mint/15 px-4 py-1.5 text-xs font-bold text-mint-soft transition group-hover:bg-mint group-hover:text-[#07161e]"
                      >
                        Collect →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load more */}
        {!loading && page < lastPage && (
          <div className="flex justify-center pt-2">
            <button
              onClick={loadMore}
              disabled={fetchingMore}
              className="rounded-xl border border-white/10 px-8 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-mint/30 hover:text-mint-soft disabled:opacity-50"
            >
              {fetchingMore ? 'Loading…' : 'Load more cards'}
            </button>
          </div>
        )}

      </div>
    </DashShell>
  )
}
