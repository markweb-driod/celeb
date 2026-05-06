'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import Logo from '../../components/Logo'

type PaymentMethod = {
  key: string
  label: string
  type: 'manual' | 'crypto' | 'gift_card'
  instructions?: string
  email?: string
  phone_or_email?: string
  handle?: string
  cashtag?: string
  phone?: string
  address?: string
  network?: string
  supported_brands?: string
  holder_name?: string
}

type Order = {
  id: number
  order_number: string
  status: string
  total_amount: string
  currency: string
  service?: { title: string }
}

const METHOD_ICONS: Record<string, string> = {
  paypal: '🅿️',
  zelle: '💜',
  cashapp: '💚',
  venmo: '🔵',
  apple_pay: '🍎',
  google_pay: '🔴',
  crypto_btc: '₿',
  crypto_eth: '⟠',
  crypto_usdt: '💲',
  gift_card: '🎁',
}

const fmt = (amount: string, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount))

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState<PaymentMethod | null>(null)
  const [giftCardCode, setGiftCardCode] = useState('')
  const [notes, setNotes] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState<{ txnNumber: string } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(`/pay/${orderId}`)}`)
      return
    }

    const load = async () => {
      try {
        const [orderRes, methodsRes] = await Promise.all([
          api.get<{ order: Order }>(`/orders/${orderId}`),
          api.get<{ methods: PaymentMethod[] }>('/payment-methods'),
        ])
        setOrder(orderRes.data.order)
        setMethods(methodsRes.data.methods)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [orderId, router])

  const uploadProof = async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('proof', file)
    const res = await api.post<{ proof_url: string }>('/payments/upload-proof', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.proof_url
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    setUploading(true)
    setSubmitError('')
    try {
      const url = await uploadProof(file)
      setProofUrl(url)
    } catch (e) {
      setSubmitError('Failed to upload proof: ' + getApiErrorMessage(e))
      setProofFile(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selected) return
    if (selected.type === 'gift_card' && !giftCardCode.trim()) {
      setSubmitError('Please enter the gift card code.')
      return
    }
    if (selected.type === 'gift_card' && !proofUrl) {
      setSubmitError('Please upload a photo of the gift card.')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await api.post<{ message: string; transaction: { transaction_number: string } }>(
        `/orders/${orderId}/payment/submit`,
        {
          payment_method: selected.key,
          proof_url: proofUrl || undefined,
          gift_card_code: giftCardCode.trim() || undefined,
          notes: notes.trim() || undefined,
        }
      )
      setSuccess({ txnNumber: res.data.transaction.transaction_number })
    } catch (e) {
      setSubmitError(getApiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030d13]">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#030d13] px-4 text-center">
        <span className="text-5xl">😕</span>
        <p className="font-display text-xl font-bold text-white">Order not found</p>
        <p className="text-sm text-slate-500">{error}</p>
        <Link href="/" className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">Back to home</Link>
      </div>
    )
  }

  if (order.status !== 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#030d13] px-4 text-center">
        <span className="text-5xl">✅</span>
        <p className="font-display text-xl font-bold text-white">Payment already submitted</p>
        <p className="text-sm text-slate-400">Order <strong className="text-white">{order.order_number}</strong> is currently <strong className="text-amber capitalize">{order.status.replace(/_/g, ' ')}</strong>.</p>
        <Link href="/fan/dashboard" className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">View my orders →</Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#030d13] px-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-600/20 text-5xl ring-2 ring-emerald-500/30">
          ⏳
        </div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Payment submitted!</h1>
        <p className="max-w-sm text-sm text-slate-400">
          Reference <strong className="font-mono text-white">{success.txnNumber}</strong>. An admin will verify your payment shortly and your booking will be confirmed.
        </p>
        <Link href="/fan/dashboard" className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold">View my orders →</Link>
      </div>
    )
  }

  // Derive display info for the selected method
  const getDestination = (m: PaymentMethod) => {
    if (m.email) return { label: 'Email', value: m.email }
    if (m.phone_or_email) return { label: 'Account', value: m.phone_or_email }
    if (m.cashtag) return { label: '$Cashtag', value: m.cashtag }
    if (m.handle) return { label: 'Handle', value: m.handle }
    if (m.phone) return { label: 'Phone', value: m.phone }
    if (m.address) return { label: m.network ? `${m.network} Address` : 'Wallet Address', value: m.address }
    return null
  }

  return (
    <div className="min-h-screen bg-[#030d13]">
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-20" />

      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#030d13]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" href={false} />
          </Link>
          <button onClick={() => router.back()} className="text-xs font-semibold text-slate-500 hover:text-white">← Back</button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-6">
        {/* Order summary strip */}
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-[#071e29]/60 px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Order</p>
            <p className="font-mono text-sm font-bold text-white">{order.order_number}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Total due</p>
            <p className="font-display text-xl font-extrabold text-amber">{fmt(order.total_amount, order.currency)}</p>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-white">Choose payment method</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">Select how you'd like to pay. All payments are reviewed manually.</p>

        {methods.length === 0 && (
          <div className="rounded-2xl border border-amber/20 bg-amber/5 px-5 py-6 text-center text-sm text-amber">
            No payment methods are currently available. Please contact support.
          </div>
        )}

        {/* Method grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {methods.map((m) => (
            <button
              key={m.key}
              onClick={() => { setSelected(m); setGiftCardCode(''); setProofUrl(''); setProofFile(null); setNotes(''); setSubmitError('') }}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 ${
                selected?.key === m.key
                  ? 'border-mint/50 bg-mint/10 text-mint'
                  : 'border-white/[0.07] bg-[#071e29]/60 text-slate-300 hover:border-white/20'
              }`}
            >
              <span className="text-3xl">{METHOD_ICONS[m.key] ?? '💳'}</span>
              <span className="text-xs font-semibold">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Payment instructions & form */}
        {selected && (
          <div className="mt-6 space-y-4 rounded-2xl border border-white/[0.07] bg-[#071e29]/80 p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{METHOD_ICONS[selected.key] ?? '💳'}</span>
              <div>
                <p className="font-display font-bold text-white">{selected.label}</p>
                {selected.instructions && (
                  <p className="mt-0.5 text-xs text-slate-400">{selected.instructions}</p>
                )}
              </div>
            </div>

            {/* Destination (address / email / handle) */}
            {(() => {
              const dest = getDestination(selected)
              return dest ? (
                <div className="rounded-xl border border-white/10 bg-[#05131b] p-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{dest.label}</p>
                  <p className="break-all font-mono text-sm font-bold text-mint">{dest.value}</p>
                  {selected.holder_name && (
                    <p className="mt-1 text-xs text-slate-400">Name: <strong className="text-white">{selected.holder_name}</strong></p>
                  )}
                  {selected.network && selected.type === 'crypto' && (
                    <p className="mt-1 text-xs text-slate-400">Network: <strong className="text-white">{selected.network}</strong></p>
                  )}
                </div>
              ) : null
            })()}

            {/* Gift card: code input */}
            {selected.type === 'gift_card' && (
              <>
                {selected.supported_brands && (
                  <p className="text-xs text-slate-400">Accepted brands: <strong className="text-white">{selected.supported_brands}</strong></p>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Gift card code *
                  </label>
                  <input
                    type="text"
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#05131b] px-4 py-3 font-mono text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/40 focus:ring-2 focus:ring-mint/10"
                  />
                </div>
              </>
            )}

            {/* Proof upload (required for gift card, optional for others) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                {selected.type === 'gift_card' ? 'Gift card photo *' : 'Payment screenshot (optional)'}
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#05131b] px-4 py-6 transition hover:border-mint/40 hover:bg-mint/5"
              >
                {proofFile ? (
                  <>
                    <span className="text-2xl">📷</span>
                    <span className="text-xs font-semibold text-mint">{proofFile.name}</span>
                    {uploading && <span className="text-[11px] text-slate-400">Uploading…</span>}
                    {!uploading && proofUrl && <span className="text-[11px] text-emerald-400">✓ Uploaded</span>}
                  </>
                ) : (
                  <>
                    <span className="text-3xl">📤</span>
                    <span className="text-xs font-semibold text-slate-400">Click to upload JPG / PNG / PDF (max 8 MB)</span>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Optional notes */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Transaction ID, any additional info…"
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#05131b] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/40 focus:ring-2 focus:ring-mint/10"
              />
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{submitError}</div>
            )}

            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || uploading}
              className="w-full rounded-xl bg-gradient-to-br from-amber to-amber-lt py-3.5 text-sm font-bold text-[#07161e] shadow-[0_4px_20px_rgba(255,177,27,0.25)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#07161e]/30 border-t-[#07161e]" />
                  Submitting…
                </span>
              ) : (
                `I Have Sent Payment — ${fmt(order.total_amount, order.currency)}`
              )}
            </button>

            <p className="text-center text-[11px] text-slate-600">
              Your payment will be verified by our team, usually within 1–4 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
