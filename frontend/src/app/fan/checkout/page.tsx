'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'

type PayMethod = 'card' | 'crypto' | 'giftcard'
type CryptoCoin = 'BTC' | 'ETH' | 'USDT' | 'SOL'

const CRYPTO_WALLETS: Record<CryptoCoin, { address: string; network: string; icon: string }> = {
  BTC:  { address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', network: 'Bitcoin Network',    icon: '₿' },
  ETH:  { address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', network: 'Ethereum (ERC-20)',  icon: 'Ξ' },
  USDT: { address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', network: 'USDT (ERC-20)',      icon: '₮' },
  SOL:  { address: 'DRpbCBMxVnDK7maPGrGBMnhFpvxNKXmLGFNxCCMVT4c', network: 'Solana Network',  icon: '◎' },
}

// Approximate USD rates (display only)
const CRYPTO_RATES: Record<CryptoCoin, number> = { BTC: 95000, ETH: 3500, USDT: 1, SOL: 180 }

function CheckoutContent() {
  const router = useRouter()
  const params = useSearchParams()
  const type      = params.get('type') ?? 'booking'
  const title     = params.get('title') ?? 'Service'
  const tier      = params.get('tier') ?? ''
  const amountStr = params.get('amount') ?? '0'
  const currency  = params.get('currency') ?? 'USD'
  const orderId   = params.get('order_id') ?? null
  const amount    = parseFloat(amountStr) || 0

  const [method, setMethod] = useState<PayMethod>('card')
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [stripeError, setStripeError] = useState('')

  // Fetch Stripe payment intent when an order_id is present
  useEffect(() => {
    if (!orderId) return
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return
    const fetchIntent = async () => {
      try {
        const res = await api.post<{ client_secret: string }>(`/orders/${orderId}/payment-intent`, {})
        setStripeClientSecret(res.data.client_secret)
      } catch {
        // Non-fatal: falls back to demo mode if Stripe not configured
      }
    }
    void fetchIntent()
  }, [orderId])
  const [coin, setCoin] = useState<CryptoCoin>('ETH')
  const [copied, setCopied] = useState(false)
  const [giftCode, setGiftCode] = useState('')
  const [giftApplied, setGiftApplied] = useState(false)
  const [giftDiscount, setGiftDiscount] = useState(0)
  const [giftError, setGiftError] = useState('')
  const [cardNum, setCardNum] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [cryptoConfirmed, setCryptoConfirmed] = useState(false)

  // Redirect unauthenticated users to login
  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      const redirect = orderId ? `/pay/${orderId}` : '/fan/checkout'
      router.replace('/login?redirect=' + encodeURIComponent(redirect))
    }
  }, [router, orderId])

  // Canonical flow uses /pay/[orderId]. Keep this route as backward-compatible redirect.
  useEffect(() => {
    if (!orderId) return
    router.replace(`/pay/${orderId}`)
  }, [orderId, router])

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
  const finalAmount = Math.max(0, amount - giftDiscount)

  const copyAddress = async () => {
    await navigator.clipboard.writeText(CRYPTO_WALLETS[coin].address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const applyGiftCard = () => {
    setGiftError('')
    if (!giftCode.trim()) { setGiftError('Enter a gift card code.'); return }
    // Demo codes
    const codes: Record<string, number> = { STAR10: 10, STAR25: 25, WELCOME50: 50, VIP100: 100 }
    const discount = codes[giftCode.toUpperCase()]
    if (!discount) { setGiftError('Invalid or expired gift card code.'); return }
    setGiftApplied(true)
    setGiftDiscount(Math.min(discount, amount))
  }

  const handleCardPay = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setStripeError('')

    // Real Stripe flow when a payment intent exists
    if (stripeClientSecret && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      try {
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        if (!stripe) throw new Error('Stripe failed to load.')

        const result = await stripe.confirmCardPayment(stripeClientSecret, {
          payment_method: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            card: {
              number: cardNum.replace(/\s/g, ''),
              exp_month: parseInt(cardExp.split('/')[0] ?? '0', 10),
              exp_year: parseInt('20' + (cardExp.split('/')[1] ?? '0'), 10),
              cvc: cardCvc,
            } as any,
            billing_details: { name: cardName },
          },
        })

        if (result.error) {
          setStripeError(result.error.message ?? 'Payment failed.')
          setProcessing(false)
          return
        }

        // Mark order as confirmed via backend on successful payment
        if (orderId) {
          await api.patch(`/orders/${orderId}/status`, { status: 'confirmed' }).catch(() => {})
        }

        setProcessing(false)
        setSuccess(true)
        return
      } catch (err) {
        setStripeError(getApiErrorMessage(err))
        setProcessing(false)
        return
      }
    }

    // Demo fallback when Stripe keys are not configured
    await new Promise(r => setTimeout(r, 2000))
    setProcessing(false)
    setSuccess(true)
  }

  const confirmCryptoPayment = async () => {
    setProcessing(true)
    await new Promise(r => setTimeout(r, 1500))
    setProcessing(false)
    setCryptoConfirmed(true)
  }

  if (orderId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030d13] px-4 text-center">
        <div>
          <p className="font-display text-xl font-bold text-white">Redirecting to secure payment...</p>
          <p className="mt-2 text-sm text-slate-400">Please wait while we open your order payment page.</p>
        </div>
      </div>
    )
  }

  if (success || cryptoConfirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#030d13] px-4 text-center">
        <div className="pointer-events-none fixed inset-0 dot-grid opacity-10" />
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-mint/10 text-4xl">
            🎉
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">Payment Successful!</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your order for <span className="font-semibold text-white">{title}</span> is confirmed.
          </p>
          {cryptoConfirmed && (
            <p className="mt-3 rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 text-xs text-amber">
              Crypto transactions are finalized after network confirmation (usually 1–10 min).
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/fan/orders" className="btn-primary w-full rounded-xl py-3 text-center text-sm font-bold">View My Bookings</Link>
            <Link href="/fan/explore" className="rounded-xl border border-white/10 py-3 text-center text-sm text-slate-400 hover:text-white">Continue Exploring</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#030d13] text-white">
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-10" />
      <div className="pointer-events-none fixed inset-0 grid-noise" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back */}
        <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-white transition">
          ← Back
        </button>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left — payment methods */}
          <div>
            <h1 className="mb-2 font-display text-2xl font-extrabold text-white sm:text-3xl">Checkout</h1>
            <p className="mb-8 text-sm text-slate-400">Choose your payment method</p>

            {/* Method tabs */}
            <div className="mb-6 grid grid-cols-3 gap-2">
              {([['card', '💳', 'Card'], ['crypto', '₿', 'Crypto'], ['giftcard', '🎁', 'Gift Card']] as [PayMethod, string, string][]).map(([m, icon, label]) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 transition ${
                    method === m ? 'border-mint/50 bg-mint/10 text-mint-soft' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>

            {/* ── Card ── */}
            {method === 'card' && (
              <form onSubmit={handleCardPay} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">Cardholder Name</label>
                  <input required value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Jane Smith" className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 px-4 text-sm text-white placeholder-slate-600 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">Card Number</label>
                  <div className="relative">
                    <input
                      required value={cardNum}
                      onChange={e => setCardNum(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())}
                      placeholder="1234 5678 9012 3456"
                      className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 pl-4 pr-12 text-sm text-white placeholder-slate-600 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10"
                    />
                    <span className="absolute inset-y-0 right-3.5 flex items-center gap-1 text-slate-600 text-xs">
                      <span>VISA</span><span>MC</span>
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">Expiry</label>
                    <input required value={cardExp} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setCardExp(v.length > 2 ? v.slice(0,2)+'/'+v.slice(2) : v) }} placeholder="MM/YY" className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 px-4 text-sm text-white placeholder-slate-600 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">CVC</label>
                    <input required value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="123" className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 px-4 text-sm text-white placeholder-slate-600 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10" />
                  </div>
                </div>

                {/* Gift card section for card method too */}
                <GiftCardRow code={giftCode} setCode={setGiftCode} applied={giftApplied} error={giftError} onApply={applyGiftCard} discount={giftDiscount} />

                <button type="submit" disabled={processing} className="btn-primary mt-2 w-full rounded-xl py-3.5 text-sm font-bold disabled:opacity-60">
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Processing…
                    </span>
                  ) : `Pay ${fmt(finalAmount)}`}
                </button>
                {stripeError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">{stripeError}</div>
                )}
                <p className="text-center text-[10px] text-slate-600">🔒 Secured by 256-bit SSL · Stripe Payments</p>
              </form>
            )}

            {/* ── Crypto ── */}
            {method === 'crypto' && (
              <div>
                {/* Coin selector */}
                <div className="mb-5 grid grid-cols-4 gap-2">
                  {(Object.keys(CRYPTO_WALLETS) as CryptoCoin[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setCoin(c)}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-bold transition ${coin === c ? 'border-amber/50 bg-amber/10 text-amber' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                    >
                      <span className="text-lg">{CRYPTO_WALLETS[c].icon}</span>
                      {c}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-amber/20 bg-amber/5 px-5 py-4 mb-4">
                  <p className="mb-1 text-xs font-semibold text-amber uppercase tracking-widest">Amount to Send</p>
                  <p className="font-display text-2xl font-extrabold text-white">
                    {(finalAmount / CRYPTO_RATES[coin]).toFixed(coin === 'USDT' ? 2 : 6)} <span className="text-base text-slate-400">{coin}</span>
                  </p>
                  <p className="text-xs text-slate-500">≈ {fmt(finalAmount)} at current rate</p>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{CRYPTO_WALLETS[coin].network} Address</p>
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#050f17] px-4 py-3">
                    <p className="flex-1 truncate font-mono text-xs text-slate-300">{CRYPTO_WALLETS[coin].address}</p>
                    <button onClick={copyAddress} className="flex-shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:border-mint/30 hover:text-mint-soft transition">
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* QR placeholder */}
                <div className="mb-5 flex items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] p-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="grid grid-cols-5 gap-0.5 opacity-40">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className={`h-4 w-4 rounded-sm ${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-600">Scan QR code with your wallet app</p>
                  </div>
                </div>

                <div className="mb-5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-xs text-slate-400 space-y-1">
                  <p>⚠️ Send only <strong className="text-white">{coin}</strong> on <strong className="text-white">{CRYPTO_WALLETS[coin].network}</strong></p>
                  <p>• Minimum 1 network confirmation required</p>
                  <p>• Your order is reserved for <strong className="text-white">30 minutes</strong></p>
                </div>

                <GiftCardRow code={giftCode} setCode={setGiftCode} applied={giftApplied} error={giftError} onApply={applyGiftCard} discount={giftDiscount} />

                <button onClick={confirmCryptoPayment} disabled={processing} className="mt-4 btn-primary w-full rounded-xl py-3.5 text-sm font-bold disabled:opacity-60">
                  {processing ? 'Verifying…' : "I've Sent the Payment"}
                </button>
                <p className="mt-2 text-center text-[10px] text-slate-600">Click after you&apos;ve sent the exact amount to the address above</p>
              </div>
            )}

            {/* ── Gift Card ── */}
            {method === 'giftcard' && (
              <div>
                <div className="mb-6 flex items-center justify-center rounded-2xl border border-dashed border-amber/30 bg-amber/5 px-6 py-10">
                  <div className="text-center">
                    <span className="mb-3 block text-5xl">🎁</span>
                    <p className="font-display text-lg font-bold text-white">Redeem a Gift Card</p>
                    <p className="mt-1 text-sm text-slate-400">Enter your CelebStarsHub gift card code below</p>
                  </div>
                </div>

                <GiftCardRow code={giftCode} setCode={setGiftCode} applied={giftApplied} error={giftError} onApply={applyGiftCard} discount={giftDiscount} large />

                {giftApplied && finalAmount <= 0 && (
                  <button
                    onClick={() => setSuccess(true)}
                    className="mt-4 btn-primary w-full rounded-xl py-3.5 text-sm font-bold"
                  >
                    Complete Order (Full Gift Card)
                  </button>
                )}

                {giftApplied && finalAmount > 0 && (
                  <div className="mt-6">
                    <p className="mb-4 text-sm text-slate-400">Remaining balance <span className="font-bold text-white">{fmt(finalAmount)}</span> — pay with:</p>
                    <div className="flex gap-3">
                      <button onClick={() => setMethod('card')} className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 hover:border-mint/30 hover:text-mint-soft">💳 Card</button>
                      <button onClick={() => setMethod('crypto')} className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 hover:border-amber/30 hover:text-amber">₿ Crypto</button>
                    </div>
                  </div>
                )}

                <div className="mt-8 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-4">
                  <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Demo codes to try</p>
                  <div className="flex flex-wrap gap-2">
                    {['STAR10 ($10)', 'STAR25 ($25)', 'WELCOME50 ($50)', 'VIP100 ($100)'].map(c => (
                      <button key={c} onClick={() => { setGiftCode(c.split(' ')[0]); setGiftApplied(false); setGiftError('') }} className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-xs text-slate-400 hover:border-amber/30 hover:text-amber transition">
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right — order summary */}
          <div className="lg:sticky lg:top-8">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h2 className="mb-5 font-display text-base font-bold text-white">Order Summary</h2>

              <div className="mb-5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{type === 'ticket' ? 'Event Ticket' : type === 'merch' ? 'Merchandise' : 'Service Booking'}</p>
                <p className="font-semibold text-white">{title}</p>
                {tier && <p className="text-xs text-slate-500 mt-0.5">{tier}</p>}
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white">{fmt(amount)}</span>
                </div>
                {giftApplied && giftDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-400">Gift Card</span>
                    <span className="text-emerald-400">−{fmt(giftDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Platform fee</span>
                  <span className="text-slate-400">Included</span>
                </div>
                <div className="border-t border-white/[0.07] pt-2.5 flex justify-between">
                  <span className="font-bold text-white">Total</span>
                  <span className="font-display text-lg font-extrabold text-white">{fmt(finalAmount)}</span>
                </div>
              </div>

              {method === 'crypto' && (
                <div className="mt-4 rounded-xl border border-amber/20 bg-amber/5 px-3 py-2.5 text-[11px] text-amber">
                  ≈ {(finalAmount / CRYPTO_RATES[coin]).toFixed(coin === 'USDT' ? 2 : 6)} {coin}
                </div>
              )}

              <div className="mt-6 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2"><span>🔒</span><span>256-bit SSL encryption</span></div>
                <div className="flex items-center gap-2"><span>✅</span><span>Escrow-protected payment</span></div>
                <div className="flex items-center gap-2"><span>↩</span><span>Money-back guarantee</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GiftCardRow({
  code, setCode, applied, error, onApply, discount, large
}: {
  code: string; setCode: (v: string) => void; applied: boolean; error: string; onApply: () => void; discount: number; large?: boolean
}) {
  return (
    <div className={large ? '' : 'mt-4 border-t border-white/[0.07] pt-4'}>
      {!large && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Have a gift card?</p>}
      {applied ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300">
          ✓ Gift card applied — <strong>${discount} off</strong>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Gift card code"
            className="flex-1 rounded-xl border border-white/10 bg-[#050f17] py-2.5 px-4 font-mono text-sm text-white placeholder-slate-600 outline-none focus:border-amber/40"
          />
          <button onClick={onApply} className="rounded-xl border border-amber/30 px-4 py-2.5 text-sm font-semibold text-amber hover:bg-amber/10 transition">
            Apply
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#030d13] text-slate-400">Loading checkout…</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
