'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { api, AUTH_TOKEN_KEY, getApiErrorMessage } from '../lib/api'
import { AuthResponse } from '../lib/types'
import Footer from '../components/Footer'
import NavBar from '../components/NavBar'

type UserType = 'fan' | 'celebrity'

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber' }
  return { score, label: 'Strong', color: 'bg-mint' }
}

export default function RegisterPage() {
  const router = useRouter()
  const [userType, setUserType] = useState<UserType>('fan')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Artist')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const pwStrength = getPasswordStrength(password)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== passwordConfirmation) {
      setErrorMessage('Passwords do not match.')
      return
    }
    setLoading(true)
    setErrorMessage('')

    try {
      const payload = {
        email,
        password,
        password_confirmation: passwordConfirmation,
        user_type: userType,
        ...(userType === 'fan' ? { display_name: name } : { stage_name: name, category }),
      }

      const response = await api.post<AuthResponse>('/auth/register', payload)
      window.localStorage.setItem(AUTH_TOKEN_KEY, response.data.access_token)
      if (response.data.user.user_type === 'admin') {
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
    <div className="relative min-h-screen bg-[#030d13] text-white">
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-20" />
      <div className="pointer-events-none fixed inset-0 grid-noise" />
      <div className="orb orb-mint pointer-events-none fixed -left-24 -top-20 h-[430px] w-[430px] opacity-20" />
      <div className="orb orb-amber pointer-events-none fixed -right-24 top-1/3 h-[320px] w-[320px] opacity-15" />

      <NavBar />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8 lg:pt-28">

        <div className="grid gap-6 lg:grid-cols-[1fr_520px] lg:items-stretch lg:gap-8">
          <section className="order-2 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl sm:p-7 lg:order-1 lg:flex lg:flex-col lg:justify-between lg:p-10">
            <div>
              <span className="section-label mb-3 inline-block">Creator economy</span>
              <h1 className="font-display text-3xl font-extrabold leading-[1.08] text-white sm:text-4xl lg:text-5xl">
                Your fan journey starts here
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                Fans get unforgettable moments. Creators unlock a premium revenue stream from direct experiences.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 lg:max-w-md">
              <div className="glass rounded-2xl px-4 py-3">
                <p className="gradient-text font-display text-xl font-extrabold">520K+</p>
                <p className="mt-0.5 text-xs text-slate-500">Moments delivered</p>
              </div>
              <div className="glass rounded-2xl px-4 py-3">
                <p className="gradient-text font-display text-xl font-extrabold">10K+</p>
                <p className="mt-0.5 text-xs text-slate-500">Verified talents</p>
              </div>
              <div className="glass rounded-2xl px-4 py-3">
                <p className="gradient-text font-display text-xl font-extrabold">$28M</p>
                <p className="mt-0.5 text-xs text-slate-500">Paid to creators</p>
              </div>
              <div className="glass rounded-2xl px-4 py-3">
                <p className="gradient-text font-display text-xl font-extrabold">4.96</p>
                <p className="mt-0.5 text-xs text-slate-500">Average rating</p>
              </div>
            </div>
          </section>

          <section className="order-1 overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#071e29]/85 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-7 lg:order-2 lg:max-h-[calc(100vh-5rem)] lg:p-8">
            <div className="mb-6 max-w-full">
              <span className="section-label">Get started</span>
              <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Already registered?{' '}
                <Link href="/login" className="font-semibold text-mint-soft transition hover:text-white">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.08] bg-[#050f17] p-1.5">
              {(['fan', 'celebrity'] as UserType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setUserType(t)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition duration-200 sm:px-4 sm:py-2.5 sm:text-sm ${
                    userType === t
                      ? 'bg-[#071e29] text-white shadow-[0_2px_12px_rgba(0,0,0,0.4)]'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'fan' ? '👤 Fan' : '⭐ Creator'}
                </button>
              ))}
            </div>

            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-300">{errorMessage}</p>
              </div>
            )}

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="name">
                  {userType === 'celebrity' ? 'Stage name' : 'Display name'}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={userType === 'celebrity' ? 'Your stage name' : 'Your display name'}
                    className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/60 focus:ring-2 focus:ring-mint/10"
                  />
                </div>
              </div>

              {userType === 'celebrity' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="category">
                    Category
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </span>
                    <input
                      id="category"
                      type="text"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Artist, Actor, Athlete…"
                      className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/60 focus:ring-2 focus:ring-mint/10"
                    />
                  </div>
                </div>
              )}

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
                    className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/60 focus:ring-2 focus:ring-mint/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full rounded-xl border border-white/10 bg-[#050f17] py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/60 focus:ring-2 focus:ring-mint/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition hover:text-slate-300"
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
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= pwStrength.score ? pwStrength.color : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-semibold ${pwStrength.score >= 4 ? 'text-mint-soft' : pwStrength.score >= 2 ? 'text-amber-lt' : 'text-red-400'}`}>
                      {pwStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="passwordConfirmation">
                  Confirm password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  <input
                    id="passwordConfirmation"
                    type={showPw2 ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="Repeat your password"
                    className={`w-full rounded-xl border bg-[#050f17] py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none transition focus:ring-2 focus:ring-mint/10 ${
                      passwordConfirmation && password !== passwordConfirmation
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : passwordConfirmation && password === passwordConfirmation
                        ? 'border-mint/50 focus:border-mint/70'
                        : 'border-white/10 focus:border-mint/60'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition hover:text-slate-300"
                  >
                    {showPw2 ? (
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
                className="btn-primary mt-2 w-full rounded-xl py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account
                  </span>
                ) : (
                  `Create ${userType === 'celebrity' ? 'creator' : 'fan'} account`
                )}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-slate-600">
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-xs text-slate-600">already a member?</span>
              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>

            <Link
              href="/login"
              className="btn-outline block w-full rounded-xl py-3 text-center text-sm font-semibold"
            >
              Sign in instead
            </Link>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
