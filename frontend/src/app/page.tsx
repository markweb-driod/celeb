import Link from 'next/link'
import FaqAccordion from './components/FaqAccordion'
import NavBar from './components/NavBar'
import Logo from './components/Logo'
import { HeroBookingCard, HeroFloatingCelebs, FeaturedCelebsGrid } from './components/LandingCelebs'

/* ─── Data ─────────────────────────────────────────────────── */

const experiences = [
  {
    icon: '🎬',
    title: 'Video Shoutouts',
    desc: 'Personalised birthday wishes, pep-talks and dedications filmed just for you.',
    backTitle: 'How it works',
    backDesc: 'Submit your request with details → Celebrity films within 7 days → Delivered to your inbox. Guaranteed.',
    tag: 'Most popular',
    accent: 'from-rose-500/20 to-pink-600/10',
  },
  {
    icon: '🎤',
    title: 'Private Sessions',
    desc: 'One-on-one virtual rooms with your favourite creators — Q&A, coaching, or just vibes.',
    backTitle: 'What\'s included',
    backDesc: '30-min live video call, private scheduling link, session recording, and a personal follow-up message.',
    tag: 'Fan favourite',
    accent: 'from-violet-500/20 to-purple-600/10',
  },
  {
    icon: '🔒',
    title: 'Exclusive Content',
    desc: 'Behind-the-scenes drops, private stories and creator-only media locked to your vault.',
    backTitle: 'Vault access',
    backDesc: 'Lifetime access in your fan vault. Download, re-watch, and share privately. Never expires.',
    tag: 'Premium',
    accent: 'from-cyan-500/20 to-teal-600/10',
  },
  {
    icon: '🎂',
    title: 'Birthday Surprises',
    desc: 'Make a birthday truly unforgettable with a live or recorded performance.',
    backTitle: 'Surprise delivery',
    backDesc: 'We handle the reveal. Send directly to the birthday person via email or WhatsApp link — no spoilers.',
    tag: 'New',
    accent: 'from-amber/20 to-orange-600/10',
  },
  {
    icon: '🤝',
    title: 'Meet & Greets',
    desc: 'Virtual or in-person fan circles — intimate, authentic, unmissable.',
    backTitle: 'Group options',
    backDesc: 'Solo or group of up to 10. Priority queue access. In-person events available in select cities.',
    tag: '',
    accent: 'from-emerald-500/20 to-green-600/10',
  },
  {
    icon: '🃏',
    title: 'Fan Collectibles',
    desc: 'Limited-edition digital collectibles signed and personalised by the star.',
    backTitle: 'Blockchain-backed',
    backDesc: 'Each collectible is minted as a unique digital asset. Transfer, trade, or display in your profile.',
    tag: 'Collectible',
    accent: 'from-indigo-500/20 to-blue-600/10',
  },
]

const categories = [
  { emoji: '🎵', label: 'Music Artists' },
  { emoji: '⚽', label: 'Athletes' },
  { emoji: '🎭', label: 'Actors' },
  { emoji: '😂', label: 'Comedians' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '📺', label: 'TV & Film' },
  { emoji: '🎨', label: 'Creators' },
  { emoji: '💼', label: 'Business' },
  { emoji: '🎤', label: 'Podcasters' },
  { emoji: '👗', label: 'Fashion' },
]

const platformFeatures = [
  { icon: '⚡', title: 'Instant Booking', desc: 'No back-and-forth. Book in 60 seconds. Secure Stripe checkout.' },
  { icon: '🛡️', title: 'Money-Back Guarantee', desc: 'If your order isn\'t delivered, you get a full refund. Zero risk.' },
  { icon: '🔔', title: 'Real-Time Updates', desc: 'Track your order status live. Get notified the moment it\'s ready.' },
  { icon: '🌍', title: 'Global Talent Pool', desc: '10,000+ creators from 80+ countries. Every niche covered.' },
  { icon: '🎁', title: 'Gift Mode', desc: 'Send directly to anyone worldwide. Perfect surprise delivery built in.' },
  { icon: '📱', title: 'Fan Vault', desc: 'All your experiences saved forever. Rewatch, download, share.' },
]

const stats = [
  { num: '10K+',  label: 'Verified talents' },
  { num: '520K+', label: 'Moments delivered' },
  { num: '$28M',  label: 'Paid to creators' },
  { num: '4.96★', label: 'Average rating' },
]

const steps = [
  {
    n: '01',
    title: 'Discover',
    desc: 'Browse thousands of verified celebrities by genre, sport, film, gaming, and more.',
  },
  {
    n: '02',
    title: 'Personalise',
    desc: 'Add names, inside jokes, and custom details so every moment feels one-of-one.',
  },
  {
    n: '03',
    title: 'Receive & Relive',
    desc: 'Get your experience delivered on time, saved in your private fan vault forever.',
  },
]

const testimonials = [
  {
    quote: 'My daughter burst into tears (happy ones) watching her birthday video. It was the most special gift we\'ve ever given. CelebStarsHub is insane.',
    name: 'Sarah M.',
    role: 'Fan since 2024',
    init: 'SM',
    color: 'from-rose-500 to-pink-600',
  },
  {
    quote: 'The virtual meet & greet was everything I dreamed it would be. Booking was done in two minutes and the experience exceeded every expectation.',
    name: 'James T.',
    role: 'Fan since 2023',
    init: 'JT',
    color: 'from-amber to-orange-500',
  },
  {
    quote: 'I\'ve booked six video messages for friends\' birthdays. Every single one was personal, on time, and absolutely worth the price.',
    name: 'Priya K.',
    role: 'Fan since 2024',
    init: 'PK',
    color: 'from-violet-500 to-purple-600',
  },
]

const faqItems = [
  { q: 'How does booking work?', a: 'Browse a celebrity, pick a service, add your personalisation details and pay securely via Stripe. You\'ll get updates as the creator works on your order and receive it within their stated delivery window.' },
  { q: 'Are all celebrities verified?', a: 'Yes — every creator goes through a rigorous identity and authenticity check before publishing a service. You\'ll always see a verified badge on legitimate profiles.' },
  { q: 'What if I\'m not satisfied?', a: 'We offer a full money-back guarantee if your order is not delivered or doesn\'t meet our quality standards. Just reach out to our support team and we\'ll make it right.' },
  { q: 'How do I join as a celebrity?', a: 'Register with the "Celebrity" account type, complete your profile, and submit for verification. Our team reviews all applications within 48 hours.' },
  { q: 'What payment methods are accepted?', a: 'We accept all major credit/debit cards, Apple Pay, and Google Pay through our Stripe-powered checkout. All transactions are SSL-encrypted.' },
  { q: 'Can I send a booking as a gift?', a: 'Absolutely. Use Gift Mode at checkout to send the experience directly to the recipient\'s email. We handle the surprise reveal — no spoilers.' },
]

const logos = ['🎬 Netflix Stars', '🏆 Athletes Inc', '🎵 Spotify Creators', '📺 HBO Talent', '⚡ TikTok Stars', '🎮 Twitch Elite', '🎬 Netflix Stars', '🏆 Athletes Inc', '🎵 Spotify Creators', '📺 HBO Talent', '⚡ TikTok Stars', '🎮 Twitch Elite']

/* ─── Page ──────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#08080a]">
      {/* ambient background layers */}
      <div className="pointer-events-none fixed inset-0 dot-grid opacity-20" />
      <div className="pointer-events-none fixed inset-0 grid-noise" />
      <div className="orb orb-mint pointer-events-none fixed left-[-15vw] top-[-10vh] h-[45vw] w-[45vw] opacity-20" />
      <div className="orb orb-amber pointer-events-none fixed right-[-14vw] top-[15vh] h-[35vw] w-[35vw] opacity-12" />

      <NavBar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-stage relative isolate overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pt-32">
        <div className="pointer-events-none absolute inset-0">
          <HeroFloatingCelebs />
        </div>
        <div className="hero-stage-fade pointer-events-none absolute inset-0" />
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px]">

            {/* Left: text */}
            <div className="relative z-10">
              <h1 className="animate-fade-up font-display text-[2.8rem] font-bold leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3.5rem]">
                Book real moments with<br className="hidden sm:block" />{' '}
                the <span className="gradient-text">celebrities</span> you love.
              </h1>

              <p className="animate-fade-up-delay mt-6 max-w-lg text-[1.0625rem] leading-relaxed text-slate-400">
                Video shoutouts, private sessions, exclusive content and live meet & greets — personalised, verified, and guaranteed on time.
              </p>

              <div className="animate-fade-up-delay mt-8 flex flex-wrap gap-3">
                <Link className="btn-primary rounded-xl px-7 py-3.5 font-semibold" href="/register">
                  Start for free →
                </Link>
                <Link className="btn-outline rounded-xl px-7 py-3.5 font-semibold" href="/login">
                  Sign in
                </Link>
              </div>

              {/* Trust row */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="text-mint-soft">✓</span> No subscription needed</span>
                <span className="flex items-center gap-1.5"><span className="text-mint-soft">✓</span> Money-back guarantee</span>
                <span className="flex items-center gap-1.5"><span className="text-mint-soft">✓</span> Verified celebrities only</span>
              </div>
            </div>

            {/* Right: booking card */}
            <div className="scene-3d relative z-10">
              <div className="card-3d rounded-3xl border border-white/[0.07] bg-[#141418]/90 p-5 shadow-[0_32px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-mint-soft">
                    <span className="live-dot" /> Live bookings
                  </span>
                  <span className="badge-mint px-2 py-0.5 text-[10px]">2 min avg checkout</span>
                </div>

                <HeroBookingCard />

                <div className="mt-4 rounded-xl border border-mint/20 bg-mint/[0.06] px-4 py-2.5 text-center text-xs font-semibold text-mint-soft">
                  🎉 4 experiences booked in the last hour
                </div>
              </div>
            </div>
          </div>

          {/* Stat bar */}
          <div className="mt-16 grid grid-cols-2 gap-4 border-t border-white/[0.05] pt-10 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="stat-num font-display text-3xl font-bold">{s.num}</p>
                <p className="mt-1 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marquee ───────────────────────────────────────────── */}
      <div className="marquee-outer my-2 border-y border-white/[0.04] py-3.5">
        <div className="marquee-track">
          {logos.map((l, i) => (
            <span key={i} className="mx-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">{l}</span>
          ))}
        </div>
      </div>

      {/* ── Categories ────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="section-label mb-2">Browse by category</div>
              <h2 className="font-display text-2xl font-bold text-white">Every niche, every genre.</h2>
            </div>
            <Link href="/register" className="text-sm font-semibold text-mint-soft transition hover:text-white">
              View all categories →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {categories.map((c) => (
              <button key={c.label} className="cat-chip">
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Celebrities ──────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="section-label mb-2">Featured celebrities</div>
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Hand-picked stars <span className="gradient-text">for you</span>
              </h2>
            </div>
            <Link href="/register" className="btn-outline rounded-xl px-5 py-2.5 text-sm font-semibold">
              Browse all talents
            </Link>
          </div>

          <FeaturedCelebsGrid />
        </div>
      </section>

      {/* ── Experiences (3D flip cards) ───────────────────────── */}
      <section id="experiences" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-3 section-label mx-auto text-center">Signature Experiences</div>
          <h2 className="mx-auto mt-2 max-w-2xl text-center font-display text-3xl font-bold leading-tight text-white sm:text-[2.25rem]">
            Premium moments — <span className="gradient-text">hover to reveal</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-slate-500">
            Hover any card to see exactly what you get. Every booking is personalised and guaranteed.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((exp, i) => (
              <div key={exp.title} className="flip-card">
                <div className="flip-card-inner">
                  {/* Front */}
                  <div className="flip-card-front">
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${exp.accent} opacity-60`} />
                    <div className="relative">
                      {exp.tag && (
                        <span className="mb-3 inline-block rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-lt">
                          {exp.tag}
                        </span>
                      )}
                      <div className="text-3xl">{exp.icon}</div>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">0{i + 1}</p>
                      <h3 className="mt-2 font-display text-lg font-bold text-white">{exp.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{exp.desc}</p>
                      <p className="mt-4 text-[11px] text-slate-600">Hover to see details →</p>
                    </div>
                  </div>
                  {/* Back */}
                  <div className="flip-card-back">
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${exp.accent}`} />
                    <div className="relative">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-mint/30 bg-mint/10 text-xl">
                        {exp.icon}
                      </div>
                      <h3 className="font-display text-base font-bold text-mint-soft">{exp.backTitle}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">{exp.backDesc}</p>
                      <Link href="/register" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-mint/15 px-4 py-2 text-xs font-bold text-mint-soft transition hover:bg-mint/25">
                        Book now →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Features (3D tilt cards) ────────────────── */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="feature-orb absolute left-1/4 top-0 h-[30vw] w-[30vw] bg-mint/10" />
        <div className="feature-orb absolute right-1/4 bottom-0 h-[25vw] w-[25vw] bg-amber/8" />
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-3 section-label mx-auto text-center">Why CelebStarsHub</div>
          <h2 className="mx-auto mt-2 max-w-xl text-center font-display text-3xl font-bold text-white sm:text-[2.25rem]">
            Built for <span className="gradient-text-amber">fans who expect more</span>
          </h2>

          <div className="scene-3d mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {platformFeatures.map((f) => (
              <div key={f.title} className="card-3d relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#141418]/80 p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">
                  {f.icon}
                </div>
                <h3 className="font-display text-base font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────────────── */}
      <div className="border-y border-white/[0.04] bg-[#0d0d10]/70 py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="stat-num font-display text-[2rem] font-bold">{s.num}</p>
              <p className="mt-1 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section id="how" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="section-label mb-3 mx-auto text-center">How It Works</div>
          <h2 className="mx-auto mt-2 max-w-xl text-center font-display text-3xl font-bold text-white sm:text-[2.25rem]">
            Three steps to an <span className="gradient-text-amber">unforgettable moment</span>
          </h2>

          <div className="relative mt-14 grid gap-5 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] top-9 hidden h-px bg-gradient-to-r from-transparent via-mint/30 to-transparent md:block" />
            {steps.map((step) => (
              <div key={step.n} className="scene-3d">
                <div className="card-3d glass rounded-3xl p-7 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-mint/25 bg-mint/[0.07]">
                    <span className="gradient-text font-display text-2xl font-bold">{step.n}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────── */}
      <section id="testimonials" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="section-label mb-3 mx-auto text-center">Fan Stories</div>
          <h2 className="mx-auto mt-2 max-w-xl text-center font-display text-3xl font-bold text-white sm:text-[2.25rem]">
            Real moments. <span className="gradient-text">Real magic.</span>
          </h2>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="scene-3d">
                <div className="card-3d glass rounded-3xl p-7">
                  <div className="stars mb-4 text-sm" />
                  <p className="text-sm leading-relaxed text-slate-300">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.color} text-[11px] font-bold text-white`}>
                      {t.init}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-[11px] text-slate-600">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Celebrity / Earnings CTA ──────────────────────────── */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-amber/20 bg-gradient-to-br from-amber/85 via-amber-lt to-[#f0b84a] p-10 shadow-[0_24px_64px_rgba(212,136,26,0.25)] sm:p-14">
          <div className="grid items-center gap-10 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <span className="mb-3 inline-block rounded-full border border-[#1a3d4a]/25 bg-[#1a3d4a]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#0a2535]">
                For Creators & Celebrities
              </span>
              <h2 className="font-display text-3xl font-bold text-[#07202b] sm:text-4xl">
                Turn your audience into a premium income stream.
              </h2>
              <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-[#1a3d4a]">
                Set your own prices, control your schedule, and keep up to 85% of every booking. Join 10,000+ creators already earning on CelebStarsHub.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[#1a3d4a]">
                <span className="flex items-center gap-1.5">✓ No exclusivity clause</span>
                <span className="flex items-center gap-1.5">✓ Weekly payouts</span>
                <span className="flex items-center gap-1.5">✓ 48h verification</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link href="/register" className="w-full rounded-2xl bg-[#07202b] px-7 py-3.5 text-center text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#0a2f3f] md:w-auto">
                Apply as Talent →
              </Link>
              <Link href="/login" className="w-full rounded-2xl border border-[#07202b]/25 px-7 py-3.5 text-center text-sm font-semibold text-[#07202b] transition hover:bg-white/30 md:w-auto">
                Sign in to dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="section-label mb-3 mx-auto text-center">FAQ</div>
          <h2 className="mt-2 text-center font-display text-3xl font-bold text-white sm:text-4xl">
            Questions, answered.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-center text-sm text-slate-500">
            Can&apos;t find what you&apos;re looking for? <Link href="/register" className="text-mint-soft hover:text-white">Contact us</Link>.
          </p>
          <div className="mt-10">
            <FaqAccordion items={faqItems} />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-28 sm:px-6 lg:px-8">
        <div className="orb orb-mint pointer-events-none absolute left-1/2 top-1/2 h-[45vw] w-[45vw] -translate-x-1/2 -translate-y-1/2 opacity-18" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <div className="section-label mb-4 mx-auto">No credit card required</div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Your next favourite memory <span className="gradient-text">starts here.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-slate-500">
            Browse for free. Pay only when you book. Cancel anytime.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary rounded-2xl px-9 py-4 text-base font-semibold">
              Create Free Account →
            </Link>
            <Link href="/login" className="btn-outline rounded-2xl px-9 py-4 text-base font-semibold">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-slate-700">
            Joined by 520,000+ fans worldwide. ★★★★★ 4.96 average rating.
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
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
            <a href="#experiences" className="transition-colors duration-200 hover:text-white">Experiences</a>
            <a href="#how" className="transition-colors duration-200 hover:text-white">How It Works</a>
            <a href="#testimonials" className="transition-colors duration-200 hover:text-white">Stories</a>
            <a href="#faq" className="transition-colors duration-200 hover:text-white">FAQ</a>
            <Link href="/register" className="transition-colors duration-200 hover:text-white">Register</Link>
            <Link href="/login" className="transition-colors duration-200 hover:text-white">Sign In</Link>
          </nav>

          {/* Security & Trust badges */}
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
              <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z"/>
              </svg>
              Escrow Protected
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-2.5 text-xs font-medium text-slate-400">
              <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
              GDPR Compliant
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
    </div>
  )
}
