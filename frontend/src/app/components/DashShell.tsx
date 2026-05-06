'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AUTH_TOKEN_KEY } from '../lib/api'
import { useRouter } from 'next/navigation'
import Logo from './Logo'

interface NavItem {
  href: string
  label: string
  icon: string
}

interface DashShellProps {
  children: React.ReactNode
  navItems: NavItem[]
  userName: string
  roleLabel: string
  accentColor?: 'mint' | 'amber'
}

export default function DashShell({ children, navItems, userName, roleLabel, accentColor = 'mint' }: DashShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const onLogout = () => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    router.replace('/login')
  }

  const accent = accentColor === 'amber'
    ? { text: 'text-amber', border: 'border-amber/30', bg: 'bg-amber/10', glow: 'shadow-[0_0_24px_rgba(255,177,27,0.18)]' }
    : { text: 'text-mint-soft', border: 'border-mint/30', bg: 'bg-mint/10', glow: 'shadow-[0_0_24px_rgba(86,245,208,0.15)]' }

  /** Shared nav link list — used in both desktop sidebar and mobile drawer */
  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <>
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNav}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? `${accent.bg} ${accent.text} ${accent.border} border ${accent.glow}`
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="mt-2 space-y-0.5 border-t border-white/[0.05] pt-2">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <span>🚪</span> Log out
        </button>
      </div>
    </>
  )

  return (
    // h-screen + overflow-hidden bounds the layout so overflow-y-auto on <main> is the real scroll container
    <div className="flex h-screen overflow-hidden bg-[#030d13]">

      {/* ── Mobile drawer backdrop ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile slide-out drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.05] bg-[#050f17] transition-transform duration-300 ease-in-out lg:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-5">
          <Logo size="sm" href={navItems[0]?.href ?? '/fan/dashboard'} />
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-white/[0.05] px-5 py-4">
          <div className={`mb-1 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${accent.bg} ${accent.text} ${accent.border}`}>
            {roleLabel}
          </div>
          <p className="mt-1.5 truncate font-display text-sm font-bold text-white">{userName}</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks onNav={() => setDrawerOpen(false)} />
        </nav>
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-white/[0.05] bg-[#050f17] lg:flex">
        <div className="border-b border-white/[0.05] px-5 py-5">
          <Logo size="sm" href={navItems[0]?.href ?? '/fan/dashboard'} />
        </div>
        <div className="border-b border-white/[0.05] px-5 py-4">
          <div className={`mb-1 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${accent.bg} ${accent.text} ${accent.border}`}>
            {roleLabel}
          </div>
          <p className="mt-1.5 truncate font-display text-sm font-bold text-white">{userName}</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks />
        </nav>
      </aside>

      {/* ── Main content column ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Mobile topbar */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#050f17] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Logo size="xs" href={false} />
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-500/30 hover:text-red-300"
          >
            Log out
          </button>
        </header>

        {/* Page content — this is the real scroll container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
