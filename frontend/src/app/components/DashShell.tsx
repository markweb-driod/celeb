'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

  const onLogout = () => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    router.replace('/login')
  }

  const accent = accentColor === 'amber'
    ? { text: 'text-amber', border: 'border-amber/30', bg: 'bg-amber/10', glow: 'shadow-[0_0_24px_rgba(255,177,27,0.18)]' }
    : { text: 'text-mint-soft', border: 'border-mint/30', bg: 'bg-mint/10', glow: 'shadow-[0_0_24px_rgba(86,245,208,0.15)]' }

  return (
    <div className="flex min-h-screen bg-[#030d13]">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-white/[0.05] bg-[#050f17] lg:flex">
        {/* Logo */}
        <div className="border-b border-white/[0.05] px-5 py-5">
          <Logo size="sm" />        
        </div>

        {/* User */}
        <div className="border-b border-white/[0.05] px-5 py-4">
          <div className={`mb-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${accent.bg} ${accent.text} ${accent.border} border`}>
            {roleLabel}
          </div>
          <p className="mt-1.5 truncate font-display text-sm font-bold text-white">{userName}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
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
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/[0.05] px-3 py-4 space-y-0.5">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200">
            <span>🏠</span> Back to site
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <span>🚪</span> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-white/[0.05] bg-[#050f17] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Logo size="xs" href={false} />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-white">Home</Link>
            <button onClick={onLogout} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-red-300">
              Log out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
