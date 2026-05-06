'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type PricingResponse = {
  defaults: {
    platform_commission_rate: number
    default_subscription_price: number
    default_fan_card_price: number
    default_currency: string
  }
}

type PricingRule = {
  id?: number
  name: string
  service_type?: string | null
  celebrity_tier?: 'rising' | 'established' | 'superstar' | '' | null
  region?: string | null
  min_price?: number | null
  max_price?: number | null
  commission_override?: number | null
  priority: number
  is_active: boolean
}

type PaymentResponse = {
  payment_config: {
    gateway_mode?: 'test' | 'live'
    stripe_publishable_key?: string
    stripe_secret_key?: string
    stripe_webhook_secret?: string
    payout_schedule?: 'manual' | 'daily' | 'weekly' | 'monthly'
    vat_rate?: number
  }
}

type CmsResponse = {
  content: {
    home_hero_title: string
    home_hero_subtitle: string
    home_featured_title: string
    site_support_email: string
    site_terms_url: string
    site_privacy_url: string
    footer_tagline: string
  }
}

const navItems = [
  { href: '/admin/dashboard', label: 'Overview',  icon: '📊' },
  { href: '/admin/users',     label: 'Users',     icon: '👥' },
  { href: '/admin/orders',    label: 'Orders',    icon: '📦' },
  { href: '/admin/reports',   label: 'Reports',   icon: '📈' },
  { href: '/admin/chats', label: 'Chats', icon: '💬' },
  { href: '/admin/control',   label: 'Control',   icon: '⚙️' },
]

export default function AdminControlPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [pricing, setPricing] = useState<PricingResponse['defaults']>({
    platform_commission_rate: 15,
    default_subscription_price: 19.99,
    default_fan_card_price: 9.99,
    default_currency: 'USD',
  })

  const [payments, setPayments] = useState<PaymentResponse['payment_config']>({
    gateway_mode: 'test',
    payout_schedule: 'weekly',
    vat_rate: 0,
  })

  const [cms, setCms] = useState<CmsResponse['content']>({
    home_hero_title: '',
    home_hero_subtitle: '',
    home_featured_title: '',
    site_support_email: '',
    site_terms_url: '',
    site_privacy_url: '',
    footer_tagline: '',
  })

  const [rules, setRules] = useState<PricingRule[]>([])

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) {
        router.replace('/login')
        return
      }

      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') {
          router.replace('/dashboard')
          return
        }
        setUser(me.data)

        const [pricingRes, paymentRes, cmsRes, rulesRes] = await Promise.all([
          api.get<PricingResponse>('/admin/pricing'),
          api.get<PaymentResponse>('/admin/payments/config'),
          api.get<CmsResponse>('/admin/cms/content'),
          api.get<{ rules: PricingRule[] }>('/admin/pricing/rules'),
        ])

        setPricing(pricingRes.data.defaults)
        setPayments(paymentRes.data.payment_config)
        setCms(cmsRes.data.content)
        setRules(rulesRes.data.rules)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const saveAll = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await Promise.all([
        api.put('/admin/pricing/defaults', pricing),
        api.put('/admin/payments/config', payments),
        api.put('/admin/cms/content', cms),
      ])

      // Upsert pricing rules in a straightforward way for now.
      for (const rule of rules) {
        if (rule.id) {
          await api.put(`/admin/pricing/rules/${rule.id}`, rule)
        } else {
          await api.post('/admin/pricing/rules', rule)
        }
      }
      setMessage('Control center settings saved.')
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashShell navItems={navItems} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold text-white">Admin Control Center</h1>
            <button
              onClick={() => void saveAll()}
              disabled={saving}
              className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-[#07161e] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save all'}
            </button>
          </div>

          {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{message}</div>}

          <section className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Pricing defaults</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Platform commission (%)
                <input
                  type="number"
                  value={pricing.platform_commission_rate}
                  onChange={(event) => setPricing((prev) => ({ ...prev, platform_commission_rate: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Default subscription price
                <input
                  type="number"
                  value={pricing.default_subscription_price}
                  onChange={(event) => setPricing((prev) => ({ ...prev, default_subscription_price: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Default fan card price
                <input
                  type="number"
                  value={pricing.default_fan_card_price}
                  onChange={(event) => setPricing((prev) => ({ ...prev, default_fan_card_price: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Default currency
                <input
                  value={pricing.default_currency}
                  onChange={(event) => setPricing((prev) => ({ ...prev, default_currency: event.target.value.toUpperCase() }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Payments configuration</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Gateway mode
                <select
                  value={payments.gateway_mode ?? 'test'}
                  onChange={(event) => setPayments((prev) => ({ ...prev, gateway_mode: event.target.value as 'test' | 'live' }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                >
                  <option value="test">test</option>
                  <option value="live">live</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Payout schedule
                <select
                  value={payments.payout_schedule ?? 'weekly'}
                  onChange={(event) => setPayments((prev) => ({ ...prev, payout_schedule: event.target.value as 'manual' | 'daily' | 'weekly' | 'monthly' }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                >
                  <option value="manual">manual</option>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                </select>
              </label>

              <label className="text-sm text-slate-300 sm:col-span-2">
                Stripe publishable key
                <input
                  value={payments.stripe_publishable_key ?? ''}
                  onChange={(event) => setPayments((prev) => ({ ...prev, stripe_publishable_key: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>

              <label className="text-sm text-slate-300 sm:col-span-2">
                Stripe secret key
                <input
                  value={payments.stripe_secret_key ?? ''}
                  onChange={(event) => setPayments((prev) => ({ ...prev, stripe_secret_key: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">CMS content management</p>
            <div className="grid gap-3">
              <label className="text-sm text-slate-300">
                Hero title
                <input
                  value={cms.home_hero_title}
                  onChange={(event) => setCms((prev) => ({ ...prev, home_hero_title: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Hero subtitle
                <textarea
                  value={cms.home_hero_subtitle}
                  onChange={(event) => setCms((prev) => ({ ...prev, home_hero_subtitle: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Support email
                <input
                  value={cms.site_support_email}
                  onChange={(event) => setCms((prev) => ({ ...prev, site_support_email: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-white"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Advanced pricing rules</p>
              <button
                onClick={() =>
                  setRules((prev) => [
                    ...prev,
                    {
                      name: 'New Rule',
                      service_type: null,
                      celebrity_tier: null,
                      region: null,
                      min_price: null,
                      max_price: null,
                      commission_override: null,
                      priority: 0,
                      is_active: true,
                    },
                  ])
                }
                className="rounded-lg border border-amber/30 px-2 py-1 text-xs text-amber hover:bg-amber/10"
              >
                Add rule
              </button>
            </div>

            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div key={rule.id ?? `new-${idx}`} className="rounded-xl border border-white/10 bg-[#05131b] p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-slate-300">
                      Rule name
                      <input
                        value={rule.name}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, name: event.target.value } : r)))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#041018] px-3 py-2 text-white"
                      />
                    </label>

                    <label className="text-sm text-slate-300">
                      Service type
                      <input
                        value={rule.service_type ?? ''}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, service_type: event.target.value || null } : r)))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#041018] px-3 py-2 text-white"
                      />
                    </label>

                    <label className="text-sm text-slate-300">
                      Tier
                      <select
                        value={rule.celebrity_tier ?? ''}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, celebrity_tier: (event.target.value || null) as PricingRule['celebrity_tier'] } : r)))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#041018] px-3 py-2 text-white"
                      >
                        <option value="">all</option>
                        <option value="rising">rising</option>
                        <option value="established">established</option>
                        <option value="superstar">superstar</option>
                      </select>
                    </label>

                    <label className="text-sm text-slate-300">
                      Region (country code)
                      <input
                        value={rule.region ?? ''}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, region: event.target.value.toUpperCase() || null } : r)))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#041018] px-3 py-2 text-white"
                      />
                    </label>

                    <label className="text-sm text-slate-300">
                      Min price
                      <input
                        type="number"
                        value={rule.min_price ?? ''}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, min_price: event.target.value ? Number(event.target.value) : null } : r)))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#041018] px-3 py-2 text-white"
                      />
                    </label>

                    <label className="text-sm text-slate-300">
                      Max price
                      <input
                        type="number"
                        value={rule.max_price ?? ''}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, max_price: event.target.value ? Number(event.target.value) : null } : r)))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#041018] px-3 py-2 text-white"
                      />
                    </label>

                    <label className="text-sm text-slate-300">
                      Commission override (%)
                      <input
                        type="number"
                        value={rule.commission_override ?? ''}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, commission_override: event.target.value ? Number(event.target.value) : null } : r)))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#041018] px-3 py-2 text-white"
                      />
                    </label>

                    <label className="text-sm text-slate-300">
                      Priority
                      <input
                        type="number"
                        value={rule.priority}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, priority: Number(event.target.value) } : r)))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#041018] px-3 py-2 text-white"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={rule.is_active}
                        onChange={(event) =>
                          setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, is_active: event.target.checked } : r)))
                        }
                      />
                      Active
                    </label>

                    <button
                      onClick={async () => {
                        try {
                          if (rule.id) await api.delete(`/admin/pricing/rules/${rule.id}`)
                          setRules((prev) => prev.filter((_, i) => i !== idx))
                        } catch (e) {
                          setError(getApiErrorMessage(e))
                        }
                      }}
                      className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {rules.length === 0 && <p className="text-sm text-slate-400">No pricing rules yet. Add one to start.</p>}
            </div>
          </section>
        </div>
      )}
    </DashShell>
  )
}
