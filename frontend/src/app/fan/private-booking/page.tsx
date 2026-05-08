'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api } from '../../lib/api'
import { AuthUser } from '../../lib/types'

const navItems = [
  { href: '/fan/dashboard',     label: 'Overview',       icon: '🏠' },
  { href: '/fan/explore',       label: 'Explore',        icon: '🔍' },
  { href: '/fan/cards',         label: 'Fan Cards',      icon: '🃏' },
  { href: '/fan/orders',        label: 'My Bookings',    icon: '📦' },
  { href: '/fan/subscriptions', label: 'Subscriptions',  icon: '⭐' },
  { href: '/fan/chat',          label: 'Chat',           icon: '💬' },
  { href: '/fan/tickets',       label: 'Tickets',        icon: '🎟️' },
  { href: '/fan/merch',         label: 'Merch Store',    icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault',         label: 'My Vault',       icon: '🔒' },
  { href: '/fan/profile',       label: 'Profile',        icon: '👤' },
]

type BookingType = 'video_shoutout' | 'live_session' | 'meet_and_greet' | 'custom_request'
type BudgetRange = 'under_50' | '50_200' | '200_500' | '500_1000' | 'over_1000'

const SERVICE_TYPES_BY_BOOKING: Record<BookingType, string[]> = {
  video_shoutout: ['video_shoutout', 'video_message', 'shoutout'],
  live_session: ['live_session'],
  meet_and_greet: ['meet_and_greet', 'meet_greet'],
  custom_request: ['custom'],
}

const BOOKING_TYPES: { value: BookingType; label: string; icon: string; desc: string }[] = [
  { value: 'video_shoutout',  label: 'Video Shoutout',  icon: '🎬', desc: 'Personalised video message for you or someone special' },
  { value: 'live_session',    label: 'Live Session',    icon: '🎙️', desc: 'One-on-one video call or live performance' },
  { value: 'meet_and_greet',  label: 'Meet & Greet',    icon: '🤝', desc: 'Virtual or in-person meet and greet experience' },
  { value: 'custom_request',  label: 'Custom Request',  icon: '✨', desc: 'Describe your idea and let the creator decide' },
]

const BUDGET_RANGES: { value: BudgetRange; label: string }[] = [
  { value: 'under_50',   label: 'Under $50'      },
  { value: '50_200',     label: '$50 – $200'     },
  { value: '200_500',    label: '$200 – $500'    },
  { value: '500_1000',   label: '$500 – $1,000'  },
  { value: 'over_1000',  label: '$1,000+'        },
]

type CelebrityResult = {
  id: number
  display_name?: string
  stage_name?: string
  user?: { email?: string }
  profile_image_url?: string
  categories?: string[]
}

type ServiceItem = {
  id: number
  celebrity_id?: number
  service_type?: string
  celebrity?: { id?: number }
}

type ServiceListPayload = {
  services?: {
    data?: ServiceItem[]
  } | ServiceItem[]
}

export default function PrivateBookingPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Celebrity search
  const [celSearch, setCelSearch] = useState('')
  const [celResults, setCelResults] = useState<CelebrityResult[]>([])
  const [celLoading, setCelLoading] = useState(false)
  const [selectedCel, setSelectedCel] = useState<CelebrityResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Form fields
  const [bookingType, setBookingType] = useState<BookingType>('video_shoutout')
  const [requestedDate, setRequestedDate] = useState('')
  const [description, setDescription] = useState('')
  const [budgetRange, setBudgetRange] = useState<BudgetRange>('50_200')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    api.get<AuthUser>('/auth/me').then((r) => {
      if (r.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
      setUser(r.data)
    }).catch(() => router.replace('/login')).finally(() => setLoading(false))
  }, [router])

  // Celebrity search debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!celSearch.trim()) { setCelResults([]); setShowDropdown(false); return }
    searchTimer.current = setTimeout(async () => {
      setCelLoading(true)
      try {
        const res = await api.get('/celebrities', { params: { search: celSearch, per_page: 8 } })
        const data = res.data as { data?: CelebrityResult[]; celebrities?: CelebrityResult[] } | CelebrityResult[]
        const list = Array.isArray(data) ? data : (data as { data?: CelebrityResult[]; celebrities?: CelebrityResult[] }).data ?? (data as { data?: CelebrityResult[]; celebrities?: CelebrityResult[] }).celebrities ?? []
        setCelResults(list)
        setShowDropdown(true)
      } catch {
        setCelResults([])
      } finally {
        setCelLoading(false)
      }
    }, 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [celSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectCelebrity = (c: CelebrityResult) => {
    setSelectedCel(c)
    setCelSearch(c.stage_name ?? c.display_name ?? c.user?.email ?? `Creator #${c.id}`)
    setShowDropdown(false)
  }

  const findServiceForRequest = async (celebrityId: number, type: BookingType): Promise<number | null> => {
    const candidates = SERVICE_TYPES_BY_BOOKING[type]

    for (const serviceType of candidates) {
      const res = await api.get<ServiceListPayload>('/services', {
        params: { service_type: serviceType, page: 1 },
      })

      const raw = res.data.services
      const list = Array.isArray(raw) ? raw : (raw?.data ?? [])
      const match = list.find((svc) => (svc.celebrity_id ?? svc.celebrity?.id) === celebrityId)
      if (match?.id) return match.id
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCel) { setErrorMsg('Please select a creator.'); return }
    if (!description.trim()) { setErrorMsg('Please describe your request.'); return }
    setSubmitState('loading')
    setErrorMsg('')
    try {
      const serviceId = await findServiceForRequest(selectedCel.id, bookingType)
      if (!serviceId) {
        setErrorMsg('No matching service is currently available for this creator. Try another booking type or creator.')
        setSubmitState('error')
        return
      }

      const customizationData: Record<string, unknown> = {
        booking_type: bookingType,
        description,
        budget_range: budgetRange,
        special_instructions: specialInstructions || null,
      }

      const payload: Record<string, unknown> = {
        service_id: serviceId,
        customization_data: customizationData,
      }

      if (requestedDate) {
        payload.booking_date = requestedDate
      }

      await api.post('/orders', {
        ...payload,
      })
      setSubmitState('success')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setErrorMsg(e?.response?.data?.message ?? 'Failed to submit booking request. Please try again.')
      setSubmitState('error')
    }
  }

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'

  if (loading) return (
    <DashShell navItems={navItems} userName="…" roleLabel="Fan" accentColor="mint">
      <div className="flex items-center justify-center py-20"><span className="text-slate-500">Loading…</span></div>
    </DashShell>
  )

  if (submitState === 'success') return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-mint/10 text-4xl">🎉</div>
        <h2 className="font-display text-2xl font-extrabold text-white">Request Sent!</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-sm">
          Your private booking request has been sent to <span className="font-semibold text-white">{selectedCel?.stage_name ?? selectedCel?.display_name ?? 'the creator'}</span>.
          You&apos;ll be notified once they respond.
        </p>
        <div className="mt-8 flex gap-4">
          <button onClick={() => { setSubmitState('idle'); setSelectedCel(null); setCelSearch(''); setDescription(''); setSpecialInstructions(''); setRequestedDate('') }} className="btn-primary rounded-xl px-6 py-3 text-sm font-bold">
            New Request
          </button>
          <button onClick={() => router.push('/fan/orders')} className="rounded-xl border border-white/10 px-6 py-3 text-sm text-slate-400 hover:text-white transition">
            My Bookings
          </button>
        </div>
      </div>
    </DashShell>
  )

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Private Booking</h1>
        <p className="mt-1 text-sm text-slate-400">Request a personalised experience directly from your favourite creator</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1 — Select Creator */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint/10 text-xs font-bold text-mint-soft">1</span>
              <h2 className="font-display font-bold text-white">Choose a Creator</h2>
            </div>
            <div className="relative" ref={dropdownRef}>
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                value={celSearch}
                onChange={e => { setCelSearch(e.target.value); if (selectedCel) setSelectedCel(null) }}
                placeholder="Search creators by name…"
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10"
              />
              {celLoading && <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-500"><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></span>}

              {showDropdown && celResults.length > 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#071e29] shadow-2xl overflow-hidden">
                  {celResults.map(c => (
                    <button type="button" key={c.id} onClick={() => selectCelebrity(c)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] transition">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mint/30 to-teal-600/30 text-lg">
                        {c.profile_image_url ? <img src={c.profile_image_url} alt="" className="h-full w-full rounded-full object-cover" /> : '🌟'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{c.stage_name ?? c.display_name ?? c.user?.email ?? `Creator #${c.id}`}</p>
                        {c.categories && c.categories.length > 0 && <p className="text-[10px] text-slate-500">{c.categories.slice(0,3).join(' · ')}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && !celLoading && celResults.length === 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#071e29] px-4 py-3 text-sm text-slate-500">No creators found</div>
              )}
            </div>
            {selectedCel && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-mint/20 bg-mint/5 px-4 py-3">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-white">{selectedCel.stage_name ?? selectedCel.display_name ?? `Creator #${selectedCel.id}`}</p>
                  <p className="text-[10px] text-slate-500">Selected</p>
                </div>
                <button type="button" onClick={() => { setSelectedCel(null); setCelSearch('') }} className="ml-auto text-xs text-slate-500 hover:text-white">Change</button>
              </div>
            )}
          </section>

          {/* Step 2 — Booking Type */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint/10 text-xs font-bold text-mint-soft">2</span>
              <h2 className="font-display font-bold text-white">Booking Type</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {BOOKING_TYPES.map(bt => (
                <button
                  type="button"
                  key={bt.value}
                  onClick={() => setBookingType(bt.value)}
                  className={`rounded-xl border p-4 text-left transition ${bookingType === bt.value ? 'border-mint/50 bg-mint/10' : 'border-white/[0.07] bg-white/[0.03] hover:border-white/20'}`}
                >
                  <span className="mb-1.5 block text-2xl">{bt.icon}</span>
                  <p className={`font-semibold text-sm ${bookingType === bt.value ? 'text-mint-soft' : 'text-white'}`}>{bt.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{bt.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Step 3 — Date + Description */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint/10 text-xs font-bold text-mint-soft">3</span>
              <h2 className="font-display font-bold text-white">Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">Preferred Date <span className="normal-case text-slate-600">(optional)</span></label>
                <input
                  type="date"
                  value={requestedDate}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  onChange={e => setRequestedDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 px-4 text-sm text-white outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">Describe Your Request <span className="text-red-400">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tell the creator exactly what you'd like — the more detail, the better your experience will be…"
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#050f17] py-3 px-4 text-sm text-white placeholder-slate-600 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10"
                />
                <p className="mt-1 text-[10px] text-slate-600">{description.length} / 1000 characters</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">Special Instructions <span className="normal-case text-slate-600">(optional)</span></label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  placeholder="Any technical requirements, props, dress code, etc."
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#050f17] py-3 px-4 text-sm text-white placeholder-slate-600 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10"
                />
              </div>
            </div>
          </section>

          {/* Step 4 — Budget */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint/10 text-xs font-bold text-mint-soft">4</span>
              <h2 className="font-display font-bold text-white">Budget Range</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {BUDGET_RANGES.map(b => (
                <button
                  type="button"
                  key={b.value}
                  onClick={() => setBudgetRange(b.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${budgetRange === b.value ? 'border-mint/50 bg-mint/10 text-mint-soft' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          {/* Error + Submit */}
          {errorMsg && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={submitState === 'loading'}
            className="btn-primary w-full rounded-xl py-4 text-base font-bold disabled:opacity-60"
          >
            {submitState === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Sending Request…
              </span>
            ) : 'Send Booking Request'}
          </button>
        </form>

        {/* Right sidebar info */}
        <div className="space-y-4 lg:sticky lg:top-8">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <h3 className="mb-3 font-display text-sm font-bold text-white">How It Works</h3>
            <ol className="space-y-3 text-xs text-slate-400">
              {[
                ['📤', 'Submit your request', 'Describe what you want and set your budget'],
                ['⏳', 'Creator reviews',     'The creator will review and respond within 48h'],
                ['💬', 'Discuss & confirm',   'Finalise details via your private inbox'],
                ['💳', 'Pay securely',        'Payment is only charged when you confirm'],
                ['🎉', 'Enjoy!',              'Receive your personalised experience'],
              ].map(([icon, title, desc], i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p>{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <h3 className="mb-3 font-display text-sm font-bold text-white">Tips for a Great Request</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>✓ Be specific about the occasion (birthday, graduation…)</li>
              <li>✓ Mention names to include in the message</li>
              <li>✓ Set a realistic budget for the experience you want</li>
              <li>✓ Give at least 7 days lead time for best availability</li>
            </ul>
          </div>
        </div>
      </div>
    </DashShell>
  )
}
