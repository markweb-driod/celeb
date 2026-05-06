'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { api, getApiErrorMessage } from '../lib/api'
import Logo from '../components/Logo'

type State = 'idle' | 'sent'

export default function ForgotPasswordPage() {
  const [state, setState] = useState<State>('idle')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sentEmail, setSentEmail] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      await api.post('/auth/forgot-password', { email })
      setSentEmail(email)
      setState('sent')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#030d13] text-white">
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-20" />
      <div className="pointer-events-none fixed inset-0 grid-noise" />
      <div className="orb orb-mint pointer-events-none fixed -left-24 -top-20 h-[430px] w-[430px] opacity-20" />
      <div className="orb orb-amber pointer-events-none fixed -right-24 top-1/3 h-[320px] w-[320px] opacity-15" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:py-10">
        <header className="mb-6 sm:mb-8">
          <Logo />
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_520px] lg:items-stretch lg:gap-8">
          <section className="order-2 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl sm:p-7 lg:order-1 lg:flex lg:flex-col lg:justify-between lg:p-10">
            <div>
              <span className="section-label mb-3 inline-block">Account recovery</span>
              <h1 className="font-display text-3xl font-extrabold leading-[1.08] text-white sm:text-4xl lg:text-5xl">
                Password reset made simple
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                We'll send you a secure link to reset your password. It only takes a moment.
              </p>
            </div>

            <div className="mt-6 space-y-3 lg:max-w-md">
              <div className="glass rounded-2xl px-4 py-3">
                <p className="font-semibold text-mint-soft">🔒 Security First</p>
                <p className="mt-1 text-xs text-slate-500">We never share your password with anyone.</p>
              </div>
              <div className="glass rounded-2xl px-4 py-3">
                <p className="font-semibold text-amber-lt">⚡ Instant Access</p>
                <p className="mt-1 text-xs text-slate-500">Reset link expires in 1 hour for your safety.</p>
              </div>
              <div className="glass rounded-2xl px-4 py-3">
                <p className="font-semibold text-white">🛡️ Verified Email</p>
                <p className="mt-1 text-xs text-slate-500">We verify it's really you before allowing changes.</p>
              </div>
            </div>
          </section>

          <section className="order-1 overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#071e29]/85 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-7 lg:order-2 lg:max-h-[calc(100vh-5rem)] lg:p-8">
            {state === 'idle' ? (
              <>
                <div className="mb-6 max-w-full">
                  <span className="section-label">Reset access</span>
                  <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                    Recover your account
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Remember your password?{' '}
                    <Link href="/login" className="font-semibold text-mint-soft transition hover:text-white">
                      Sign in
                    </Link>
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-300">{errorMessage}</p>
                  </div>
                )}

                <form className="space-y-5" onSubmit={onSubmit}>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="email">
                      Email address
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/60 focus:ring-2 focus:ring-mint/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full rounded-xl py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending reset link
                      </span>
                    ) : (
                      'Send reset link'
                    )}
                  </button>

                  <p className="text-center text-[11px] leading-relaxed text-slate-600">
                    Check your email for a link to reset your password. The link will expire in 1 hour.
                  </p>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mint/10">
                    <svg className="h-8 w-8 text-mint-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                    Reset link sent!
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    We've sent a password reset link to:
                  </p>
                  <p className="mt-2 font-semibold text-mint-soft text-sm">
                    {sentEmail}
                  </p>
                </div>

                <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                  <p className="text-sm leading-relaxed text-slate-300">
                    Click the link in the email to reset your password. The link will expire in 1 hour. Check your spam folder if you don't see it.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setState('idle')
                      setEmail('')
                      setErrorMessage('')
                      setSentEmail('')
                    }}
                    className="btn-outline w-full rounded-xl py-3 text-sm font-semibold"
                  >
                    Try a different email
                  </button>

                  <Link
                    href="/login"
                    className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
