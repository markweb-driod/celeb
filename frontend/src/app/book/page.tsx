'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../lib/api'
import Logo from '../components/Logo'

type Service = {
  id: number
  title: string
  description: string | null
  service_type: string
  base_price: string
  currency: string
  delivery_days: number
  celebrity_profile: {
    id: number
    stage_name: string
    category: string
    is_verified: boolean
  } | null
}

type ServicePayload = { service: Service }

type OrderPayload = {
  order: {
    id: number
    order_number: string
    status: string
    total_amount: string
  }
}

const fmt = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 0 }).format(Number(amount))

const serviceTypeIcon: Record<string, string> = {
  video_shoutout: '🎬',
  live_session: '🎤',
  exclusive_content: '🔒',
  meet_and_greet: '🤝',
  birthday_surprise: '🎂',
  custom: '✨',
}

function BookingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const serviceId = searchParams.get('id')?.trim() ?? ''

  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)
  const [serviceError, setServiceError] = useState('')

  const [recipientName, setRecipientName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [isGift, setIsGift] = useState(false)
  const [giftEmail, setGiftEmail] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!serviceId) {
      setServiceError('Missing service id.')
      setLoadingService(false)
      return
    }

    const load = async () => {
      try {
        const res = await api.get<ServicePayload>(`/services/${serviceId}`)
        setService(res.data.service)
      } catch (e) {
        setServiceError(getApiErrorMessage(e))
      } finally {
        setLoadingService(false)
      }
    }

    void load()
  }, [serviceId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(`/book?id=${serviceId}`)}`)
      return
    }
    if (!recipientName.trim()) {
      setSubmitError('Please enter a recipient name.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload: Record<string, unknown> = {
        service_id: Number(serviceId),
        recipient_name: recipientName.trim(),
        instructions: instructions.trim() || null,
        is_gift: isGift,
      }
      if (isGift && giftEmail) payload.gift_email = giftEmail.trim()
      const res = await api.post<OrderPayload>('/orders', payload)
      // Redirect to payment page immediately after order creation
      router.push(`/pay/${res.data.order.id}`)
    } catch (e) {
      setSubmitError(getApiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingService) return (
    <div className="flex min-h-screen items-center justify-center bg-[#030d13]">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
    </div>
  )

  if (serviceError || !service) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#030d13] px-4 text-center">
      <span className="text-5xl">😕</span>
      <p className="font-display text-xl font-bold text-white">Service not found</p>
      <p className="text-sm text-slate-500">{serviceError}</p>
      <Link href="/" className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">Back to home</Link>
    </div>
  )

  const icon = serviceTypeIcon[service.service_type] ?? '✨'
  const celeb = service.celebrity_profile

  return (
    <div className="min-h-screen bg-[#030d13]">
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-20" />
      <div className="orb orb-mint pointer-events-none fixed left-[-20vw] top-[-10vh] h-[40vw] w-[40vw] opacity-15" />

      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#030d13]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" href={false} />
          </Link>
          <button onClick={() => router.back()} className="text-xs font-semibold text-slate-500 hover:text-white">← Back</button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Complete your booking</h1>
              <p className="mt-1 text-sm text-slate-500">Fill in your details and we'll send them to the creator.</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Who is this for? *
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Sarah, my daughter"
                    required
                    className="w-full rounded-xl border border-white/[0.08] bg-[#071e29] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/40 focus:ring-2 focus:ring-mint/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Personalisation instructions
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Add names, inside jokes, favourite topics, special wishes - the more detail the better!"
                    rows={4}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#071e29] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/40 focus:ring-2 focus:ring-mint/10 resize-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-600">{instructions.length}/500 characters</p>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#071e29]/60 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setIsGift(!isGift)}
                    className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${isGift ? 'bg-mint' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isGift ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-white">Send as a gift 🎁</p>
                    <p className="text-[11px] text-slate-600">Deliver directly to someone else's email</p>
                  </div>
                </div>

                {isGift && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Recipient's email
                    </label>
                    <input
                      type="email"
                      value={giftEmail}
                      onChange={(e) => setGiftEmail(e.target.value)}
                      placeholder="friend@email.com"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#071e29] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/40 focus:ring-2 focus:ring-mint/10"
                    />
                  </div>
                )}

                {submitError && (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-br from-amber to-amber-lt py-3.5 text-sm font-bold text-[#07161e] shadow-[0_4px_20px_rgba(255,177,27,0.25)] transition hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#07161e]/30 border-t-[#07161e]" />
                      Placing order...
                    </span>
                  ) : (
                    `Confirm & Pay ${fmt(service.base_price, service.currency)}`
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-600">
                  🔒 Secure checkout · Money-back guarantee · No hidden fees
                </p>
              </form>
            </div>

            <div className="lg:sticky lg:top-24 self-start space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/80 p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-600">Order Summary</p>

                <div className="flex items-start gap-3 mb-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-2xl">{icon}</span>
                  <div>
                    <p className="font-display text-sm font-bold text-white">{service.title}</p>
                    <p className="mt-0.5 text-[11px] capitalize text-slate-600">{service.service_type.replaceAll('_', ' ')}</p>
                  </div>
                </div>

                {celeb && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber/40 to-orange-600/40 text-[10px] font-bold text-white">
                      {celeb.stage_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{celeb.stage_name}</p>
                      <p className="text-[10px] capitalize text-slate-600">{celeb.category}</p>
                    </div>
                    {celeb.is_verified && (
                      <span className="ml-auto text-[10px] font-bold text-amber">✓ Verified</span>
                    )}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Service price</span>
                    <span className="text-white">{fmt(service.base_price, service.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery</span>
                    <span className="text-white">Within {service.delivery_days} day{service.delivery_days !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="border-t border-white/[0.06] pt-2 flex justify-between font-bold">
                    <span className="text-white">Total</span>
                    <span className="gradient-text-amber text-base">{fmt(service.base_price, service.currency)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#071e29]/50 p-4 space-y-2.5">
                {[
                  { icon: '🛡️', text: 'Money-back guarantee if not delivered' },
                  { icon: '🔒', text: 'Secure manual payment processing' },
                  { icon: '⭐', text: 'Verified celebrity authenticity' },
                  { icon: '🔔', text: 'Real-time order status updates' },
                ].map((g) => (
                  <div key={g.text} className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{g.icon}</span>
                    <span>{g.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#030d13]">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
        </div>
      }
    >
      <BookingPageContent />
    </Suspense>
  )
}