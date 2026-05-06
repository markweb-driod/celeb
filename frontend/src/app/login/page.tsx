'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'
import { api, AUTH_TOKEN_KEY, getApiErrorMessage } from '../lib/api'
import { AuthResponse } from '../lib/types'
import Logo from '../components/Logo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null)

  const demoAccounts = [
    { label: 'Fan',       email: 'fan@demo.com',              password: 'password',  badge: 'fan' },
    { label: 'Creator',   email: 'celebrity@demo.com',        password: 'password',  badge: 'celebrity' },
    { label: 'Creator 2', email: 'celebrity2@demo.com',       password: 'password',  badge: 'celebrity' },
    { label: 'Admin',     email: 'admin@celebstarshub.com',   password: 'Admin@1234', badge: 'admin' },
  ]

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setErrorMessage('')
    setSelectedDemo(demoEmail)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password })
      window.localStorage.setItem(AUTH_TOKEN_KEY, response.data.access_token)
      if (redirect) {
        router.push(redirect)
      } else if (response.data.user.user_type === 'admin') {
        router.push('/admin/dashboard')
      } else if (response.data.user.user_type === 'celebrity') {
        router.push('/celebrity/dashboard')
      } else {
        router.push('/fan/dashboard')
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#030d13] text-white lg:flex">
      {/* bg effects */}
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-20" />
      <div className="pointer-events-none fixed inset-0 grid-noise" />

      {/* ── LEFT PANEL ── */}
      <aside className="relative hidden overflow-hidden border-r border-white/[0.07] lg:flex lg:w-[42%] xl:w-[40%]">
        <div className="orb orb-mint pointer-events-none absolute -left-24 -top-24 h-[500px] w-[500px] opacity-25" />
        <div className="orb orb-amber pointer-events-none absolute -bottom-20 right-0 h-[380px] w-[380px] opacity-15" />

        <div className="relative flex h-full w-full flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
          {/* Logo */}
          <Logo />

          {/* Copy */}
          <div>
            <span className="section-label mb-4 inline-block">Welcome back</span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] text-white xl:text-5xl">
              Sign in and continue your fan journey
            </h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-400">
              Access bookings, private messages, and your creator or fan dashboard all in one place.
            </p>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { num: '520K+', label: 'Moments delivered' },
                { num: '10K+',  label: 'Verified talents' },
                { num: '$28M',  label: 'Paid to creators' },
                { num: '4.96★', label: 'Average rating' },
              ].map((s) => (
                <div key={s.label} className="glass rounded-2xl px-4 py-3">
                  <p className="gradient-text font-display text-xl font-extrabold">{s.num}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} CelebStarsHub · TLS secured</p>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6">
            <span className="section-label">Sign in</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Good to have you back.
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-mint-soft transition hover:text-white">
                Create one free
              </Link>
            </p>
          </div>

          {/* Demo accounts */}
          <div className="mb-5 rounded-xl border border-amber/30 bg-amber/[0.08] px-4 py-3">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-lt">Demo accounts — click to fill</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account.email, account.password)}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                    selectedDemo === account.email
                      ? 'border-amber/60 bg-amber/[0.13] ring-1 ring-amber/30'
                      : 'border-white/10 bg-white/[0.04] hover:border-amber/40 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-white">{account.label}</p>
                    <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                      account.badge === 'admin' ? 'bg-red-500/20 text-red-400' :
                      account.badge === 'celebrity' ? 'bg-mint/10 text-mint-soft' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>{account.badge}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">{account.email}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">pw: <span className="text-slate-300">{account.password}</span></p>
                  {selectedDemo === account.email && (
                    <p className="mt-1 text-[10px] font-semibold text-amber">✓ filled</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition duration-200 focus:border-mint/60 focus:bg-[#081826] focus:ring-2 focus:ring-mint/10"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="password">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-slate-500 transition hover:text-mint-soft">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none transition duration-200 focus:border-mint/60 focus:bg-[#081826] focus:ring-2 focus:ring-mint/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition hover:text-slate-300"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
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
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-xs text-slate-600">or</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          <p className="text-center text-sm text-slate-500">
            New to CelebStarsHub?{' '}
            <Link href="/register" className="font-semibold text-amber-lt transition hover:text-white">
              Create a free account
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
