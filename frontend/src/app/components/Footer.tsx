import Link from 'next/link'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] px-6 pb-10 pt-20 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-5xl">

        {/* Brand block */}
        <div className="mb-16 flex flex-col items-center gap-4 text-center">
          <Logo size="lg" />
          <p className="max-w-xs text-sm leading-relaxed text-slate-500">
            The world&apos;s premier celebrity booking platform.<br />Personalised. Verified. Guaranteed.
          </p>
        </div>

        {/* Navigation */}
        <nav className="mb-14 flex flex-wrap justify-center gap-8 text-sm text-slate-500">
          <Link href="/#experiences" className="transition-colors duration-200 hover:text-white">Experiences</Link>
          <Link href="/#how" className="transition-colors duration-200 hover:text-white">How It Works</Link>
          <Link href="/#testimonials" className="transition-colors duration-200 hover:text-white">Stories</Link>
          <Link href="/#faq" className="transition-colors duration-200 hover:text-white">FAQ</Link>
          <Link href="/register" className="transition-colors duration-200 hover:text-white">Register</Link>
          <Link href="/login" className="transition-colors duration-200 hover:text-white">Sign In</Link>
        </nav>

        {/* Trust badges */}
        <div className="mb-16 flex flex-wrap items-center justify-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-2.5 text-xs font-medium text-slate-400">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            SSL / TLS Secured
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-2.5 text-xs font-medium text-slate-400">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            256-bit Encryption
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-2.5 text-xs font-medium text-slate-400">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-[#635bff]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
            Stripe Verified Payments
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-2.5 text-xs font-medium text-slate-400">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-amber" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            4.96 / 5 · Trusted by 520k+
          </span>
        </div>

        {/* Divider */}
        <div className="mb-8 h-px bg-white/[0.05]" />

        {/* Legal row */}
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-slate-700 sm:flex-row">
          <p>© {new Date().getFullYear()} CelebStarsHub Ltd. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="transition-colors hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-slate-400">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-slate-400">Cookie Policy</a>
            <a href="#" className="transition-colors hover:text-slate-400">Support</a>
          </div>
        </div>

      </div>
    </footer>
  )
}
