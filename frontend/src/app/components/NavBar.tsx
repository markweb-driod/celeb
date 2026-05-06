'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'

const links = [
  { label: 'Experiences', href: '#experiences' },
  { label: 'How It Works', href: '#how' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
]

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('')
  const ticking = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40)
          ticking.current = false
        })
        ticking.current = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = ['experiences', 'how', 'testimonials', 'faq']
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive('#' + entry.target.id)
        }
      },
      { threshold: 0.35, rootMargin: '-60px 0px 0px 0px' }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/[0.07] bg-[#030d13]/90 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[64px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex select-none" onClick={() => setMenuOpen(false)}>
          <Logo href={false} textClass="transition group-hover:text-mint-soft" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((lk) => (
            <a
              key={lk.href}
              href={lk.href}
              className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition duration-200 ${
                active === lk.href
                  ? 'text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lk.label}
              {active === lk.href && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-mint" />
              )}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="btn-primary rounded-xl px-5 py-2 text-sm"
          >
            Get started
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-white/20 hover:text-white md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-white/[0.07] bg-[#030d13]/96 backdrop-blur-xl transition-all duration-300 md:hidden ${
          menuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {links.map((lk) => (
            <a
              key={lk.href}
              href={lk.href}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              {lk.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.07] pt-3">
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link href="/register" className="btn-primary rounded-xl px-4 py-3 text-sm" onClick={() => setMenuOpen(false)}>Create free account</Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
