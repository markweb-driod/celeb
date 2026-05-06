'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../lib/api'
import Logo from '../components/Logo'

type Service = {
  id: number
  title: string
  description: string | null
  service_type: string
  base_price: string
  currency: string
  delivery_days: number
  status: string
  total_sold: number
}

type CelebProfile = {
  id: number
  stage_name: string
  category: string
  bio: string | null
  is_verified: boolean
  min_price: string | null
  avatar_url: string | null
  total_reviews: number
  average_rating: number | null
  services?: Service[]
}

type ProfilePayload = { celebrity: CelebProfile }

const serviceTypeIcon: Record<string, string> = {
  video_shoutout: '🎬',
  live_session: '🎤',
  exclusive_content: '🔒',
  meet_and_greet: '🤝',
  birthday_surprise: '🎂',
  custom: '✨',
}

const fmt = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 0 }).format(Number(amount))

function CelebrityProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')?.trim() ?? ''

  const [profile, setProfile] = useState<CelebProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setError('Missing celebrity id.')
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const res = await api.get<ProfilePayload>(`/celebrities/${id}`)
        setProfile(res.data.celebrity)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

  const initials = profile?.stage_name?.slice(0, 2).toUpperCase() ?? '??'

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#030d13]">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
    </div>
  )

  if (error || !profile) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#030d13] px-4 text-center">
      <span className="text-5xl">😕</span>
      <p className="font-display text-xl font-bold text-white">Profile not found</p>
      <p className="text-sm text-slate-500">{error || 'This creator profile does not exist.'}</p>
      <Link href="/" className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">Back to home</Link>
    </div>
  )

  const activeServices = profile.services?.filter(s => s.status === 'active') ?? []
  const rating = profile.average_rating ? profile.average_rating.toFixed(1) : null

  return (
    <div className="min-h-screen bg-[#030d13]">
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-20" />
      <div className="orb orb-mint pointer-events-none fixed left-[-20vw] top-[-10vh] h-[40vw] w-[40vw] opacity-15" />

      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#030d13]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" href={false} />
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="text-xs font-semibold text-slate-500 hover:text-white">← Back</button>
            <Link href="/register" className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold">Book now</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-10 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#071e29]/70 p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-6">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-amber/40 to-orange-600/40 font-display text-3xl font-bold text-white ring-2 ring-amber/20 sm:h-28 sm:w-28">
                {initials}
              </div>
              {profile.is_verified && (
                <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#071e29] bg-amber text-xs">✓</span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{profile.stage_name}</h1>
                {profile.is_verified && (
                  <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber">
                    Verified ✓
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium capitalize text-slate-400">{profile.category}</p>

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {rating && (
                  <span className="flex items-center gap-1 text-amber font-semibold">
                    ★ {rating}
                    <span className="text-slate-600 font-normal">({profile.total_reviews} reviews)</span>
                  </span>
                )}
                {profile.min_price && (
                  <span className="text-slate-400">
                    Starting from <span className="font-semibold text-white">${profile.min_price}</span>
                  </span>
                )}
              </div>

              {profile.bio && (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">Available Experiences</h2>
          <span className="text-xs text-slate-600">{activeServices.length} service{activeServices.length !== 1 ? 's' : ''}</span>
        </div>

        {activeServices.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/50 py-16 text-center">
            <p className="text-sm text-slate-500">No services available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeServices.map((svc) => {
              const icon = serviceTypeIcon[svc.service_type] ?? '✨'
              return (
                <div key={svc.id} className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/70 transition hover:border-mint/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  <div className="flex-1 p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-2xl">{icon}</span>
                      <span className="text-xs font-semibold capitalize text-slate-600">{svc.service_type.replaceAll('_', ' ')}</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-white">{svc.title}</h3>
                    {svc.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{svc.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-600">
                      <span>⏱ {svc.delivery_days}d delivery</span>
                      {svc.total_sold > 0 && <span>· {svc.total_sold} sold</span>}
                    </div>
                  </div>
                  <div className="border-t border-white/[0.05] p-4 flex items-center justify-between">
                    <p className="gradient-text-amber font-display text-lg font-bold">{fmt(svc.base_price, svc.currency)}</p>
                    <Link
                      href={`/book?id=${svc.id}`}
                      className="rounded-xl bg-mint/15 px-4 py-2 text-xs font-bold text-mint-soft transition group-hover:bg-mint/25"
                    >
                      Book →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CelebrityProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#030d13]">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
        </div>
      }
    >
      <CelebrityProfileContent />
    </Suspense>
  )
}