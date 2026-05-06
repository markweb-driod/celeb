import Link from 'next/link'
import Logo from './Logo'

type AuthSplitShellProps = {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}

const socialProof = [
  { num: '520K+', label: 'Moments delivered' },
  { num: '10K+',  label: 'Verified talents' },
  { num: '$28M',  label: 'Paid to creators' },
  { num: '4.96★', label: 'Average rating' },
]

export default function AuthSplitShell({ eyebrow, title, description, children }: AuthSplitShellProps) {
  return (
    <div className="relative min-h-screen bg-[#030d13] text-white lg:flex">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-20" />
      <div className="pointer-events-none fixed inset-0 grid-noise" />

      {/* Left panel */}
      <aside className="relative hidden overflow-hidden border-r border-white/[0.07] lg:flex lg:w-[44%] xl:w-[42%]">
        <div className="orb orb-mint pointer-events-none absolute -left-24 -top-24 h-[500px] w-[500px] opacity-25" />
        <div className="orb orb-amber pointer-events-none absolute -bottom-20 right-0 h-[380px] w-[380px] opacity-15" />

        <div className="relative flex h-full flex-col justify-between px-12 py-14 xl:px-16 xl:py-16">
          {/* Logo */}
          <Logo />

          {/* Copy */}
          <div className="my-auto max-w-sm">
            <span className="section-label mb-4 inline-block">{eyebrow}</span>
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.07] text-white xl:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-400">{description}</p>

            {/* Testimonial */}
            <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="stars mb-3" />
              <p className="text-sm leading-relaxed text-slate-300">
                &ldquo;CelebStarsHub turned my daughter&apos;s birthday into the most magical moment of her life. Pure magic.&rdquo;
              </p>
              <p className="mt-3 text-xs font-semibold text-slate-500">— Sarah M., Fan since 2024</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {socialProof.map((s) => (
              <div key={s.label} className="glass rounded-2xl px-4 py-3">
                <p className="gradient-text font-display text-xl font-extrabold">{s.num}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex min-h-screen flex-1 items-center justify-center px-4 py-12 sm:px-8 lg:px-12">
        {/* Mobile logo */}
        <div className="absolute left-5 top-5 lg:hidden">
          <Logo size="sm" />
        </div>

        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  )
}
