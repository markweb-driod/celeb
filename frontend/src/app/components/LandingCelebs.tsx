'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type ApiCelebrity = {
  id: number
  stage_name: string
  category: string
  min_price: string | null
  average_rating: number | string | null
  total_reviews: number
}

const CARD_GRADIENTS = [
  'from-rose-500 to-pink-600',
  'from-amber to-orange-500',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-mint to-cyan-500',
  'from-indigo-500 to-blue-600',
]

const getInitials = (name: string) =>
  name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()

const fmtCelebPrice = (v: string | null) =>
  v ? `from $${Math.round(Number(v))}` : null

async function loadCelebrities(base: string): Promise<ApiCelebrity[]> {
  const b = base.replace(/\/$/, '')
  try {
    const r1 = await fetch(`${b}/celebrities?per_page=8&is_featured=true`)
    if (r1.ok) {
      const d = await r1.json() as { celebrities?: { data?: ApiCelebrity[] } }
      const list = d?.celebrities?.data ?? []
      if (list.length >= 4) return list
    }
  } catch { /* ignore */ }
  try {
    const r2 = await fetch(`${b}/celebrities?per_page=8`)
    if (r2.ok) {
      const d = await r2.json() as { celebrities?: { data?: ApiCelebrity[] } }
      return d?.celebrities?.data ?? []
    }
  } catch { /* ignore */ }
  return []
}

/* ── Hero booking card ─────────────────────────────────────── */
export function HeroBookingCard() {
  const [celebs, setCelebs] = useState<ApiCelebrity[]>([])

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8001/api/v1'
    void loadCelebrities(base).then(setCelebs)
  }, [])

  if (celebs.length === 0) {
    // skeleton while loading
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-2 flex animate-pulse items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
            <span className="h-8 w-8 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-2 w-16 rounded bg-white/10" />
            </div>
            <div className="h-3 w-10 rounded bg-white/10" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {celebs.slice(0, 4).map((c, i) => (
        <div key={c.id} className="mb-2 flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition hover:border-mint/25 hover:bg-mint/[0.04]">
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} text-[10px] font-bold text-white`}>
            {getInitials(c.stage_name)}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{c.stage_name}</p>
            <p className="text-[11px] text-slate-500">{c.category}</p>
          </div>
          <p className="gradient-text-amber text-sm font-bold">{fmtCelebPrice(c.min_price) ?? '—'}</p>
        </div>
      ))}
    </>
  )
}

/* ── Hero floating background layers ──────────────────────── */
export function HeroFloatingCelebs() {
  const [celebs, setCelebs] = useState<ApiCelebrity[]>([])

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8001/api/v1'
    void loadCelebrities(base).then(setCelebs)
  }, [])

  return (
    <>
      {celebs.slice(0, 4).map((celeb, idx) => (
        <div
          key={celeb.id}
          className="hero-celeb-layer"
          style={{ animationDelay: `${idx * 4.5}s` }}
        >
          <div className="hero-celeb-content">
            <span className={`hero-celeb-avatar bg-gradient-to-br ${CARD_GRADIENTS[idx % CARD_GRADIENTS.length]}`}>
              {getInitials(celeb.stage_name)}
            </span>
            <div>
              <p className="hero-celeb-name">{celeb.stage_name}</p>
              <p className="hero-celeb-meta">{celeb.category}{fmtCelebPrice(celeb.min_price) ? ` · ${fmtCelebPrice(celeb.min_price)}` : ''}</p>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

/* ── Featured celebrities grid ────────────────────────────── */
export function FeaturedCelebsGrid() {
  const [celebs, setCelebs] = useState<ApiCelebrity[] | null>(null)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8001/api/v1'
    void loadCelebrities(base).then(setCelebs)
  }, [])

  // loading skeleton
  if (celebs === null) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="h-2 w-14 rounded bg-white/10" />
              </div>
            </div>
            <div className="h-2 w-full rounded bg-white/10" />
          </div>
        ))}
      </div>
    )
  }

  if (celebs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <p className="text-sm text-slate-500">No celebrities available yet.</p>
        <Link href="/register" className="mt-3 text-sm text-mint-soft transition hover:text-white">
          Register to get notified →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {celebs.map((t, i) => (
        <Link key={t.id} href={`/celebrity?id=${t.id}`} className="talent-card group p-5 block">
          <div className="mb-4 flex items-center gap-3">
            <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} text-sm font-bold text-white shadow-lg`}>
              {getInitials(t.stage_name)}
            </span>
            <div>
              <p className="font-display text-sm font-bold text-white leading-tight">{t.stage_name}</p>
              <p className="text-[11px] text-slate-500">{t.category}</p>
            </div>
          </div>
          {(Number(t.average_rating) > 0 || t.total_reviews > 0) && (
            <div className="mb-3 flex items-center justify-between text-[11px]">
              {Number(t.average_rating) > 0 && <span className="text-amber font-semibold">★ {Number(t.average_rating).toFixed(1)}</span>}
              {t.total_reviews > 0 && <span className="text-slate-600">{t.total_reviews} review{t.total_reviews !== 1 ? 's' : ''}</span>}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="gradient-text-amber text-sm font-bold">{fmtCelebPrice(t.min_price) ?? 'View services'}</p>
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white transition group-hover:border-mint/30 group-hover:bg-mint/[0.06] group-hover:text-mint-soft">
              Book →
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
