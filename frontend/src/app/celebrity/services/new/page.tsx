'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../../lib/api'
import { AuthUser } from '../../../lib/types'

type Category = {
  id: number
  name: string
}

type CategoryPayload = {
  categories: Category[]
}

const navItems = [
  { href: '/celebrity/dashboard', label: 'Overview', icon: 'OV' },
  { href: '/celebrity/services', label: 'Services', icon: 'SV' },
  { href: '/celebrity/orders', label: 'Orders', icon: 'OR' },
  { href: '/celebrity/earnings', label: 'Earnings', icon: 'EC' },
  { href: '/celebrity/chat',      label: 'Fan Chat',   icon: 'CH' },
  { href: '/celebrity/profile', label: 'Profile', icon: 'PR' },
]

const serviceTypes = [
  { value: 'fan_card', label: 'Fan Card' },
  { value: 'video_message', label: 'Video Message' },
  { value: 'private_event', label: 'Private Event' },
  { value: 'birthday_performance', label: 'Birthday Performance' },
  { value: 'meet_greet', label: 'Meet & Greet' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'exclusive_content', label: 'Exclusive Content' },
  { value: 'membership', label: 'Membership' },
  { value: 'shoutout', label: 'Shoutout' },
  { value: 'video_shoutout', label: 'Video Shoutout' },
  { value: 'live_session', label: 'Live Session' },
  { value: 'meet_and_greet', label: 'Meet and Greet' },
  { value: 'birthday_surprise', label: 'Birthday Surprise' },
  { value: 'custom', label: 'Custom' },
]

export default function NewCelebrityServicePage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [categoryId, setCategoryId] = useState('')
  const [serviceType, setServiceType] = useState('video_message')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [isDigital, setIsDigital] = useState(true)
  const [requiresBooking, setRequiresBooking] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState('')

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) {
        router.replace('/login')
        return
      }

      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'celebrity') {
          router.replace('/fan/dashboard')
          return
        }
        setUser(me.data)

        const categoryRes = await api.get<CategoryPayload>('/categories')
        setCategories(categoryRes.data.categories ?? [])
        if (categoryRes.data.categories?.length) {
          setCategoryId(String(categoryRes.data.categories[0].id))
        }
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('category_id', String(Number(categoryId)))
      formData.append('service_type', serviceType)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('base_price', String(Number(basePrice)))
      formData.append('is_digital', isDigital ? '1' : '0')
      formData.append('requires_booking', requiresBooking ? '1' : '0')
      if (durationMinutes) formData.append('duration_minutes', String(Number(durationMinutes)))
      imageFiles.forEach((f) => formData.append('images_upload[]', f))
      if (videoFile) formData.append('service_video', videoFile)

      await api.post('/celebrity/services', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      router.push('/celebrity/services')
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const stageName = user?.celebrity_profile?.stage_name ?? user?.celebrityProfile?.stage_name ?? user?.email ?? 'Creator'

  return (
    <DashShell navItems={navItems} userName={stageName} roleLabel="Creator" accentColor="amber">
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber">Service studio</p>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Create new service</h1>
            </div>
            <Link href="/celebrity/services" className="btn-outline rounded-xl px-4 py-2 text-sm font-semibold">
              Back to services
            </Link>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
          )}

          <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Category</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Service type</label>
                <select
                  required
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
                >
                  {serviceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Premium birthday shoutout"
                className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe what fans receive, delivery expectations, and anything they should provide."
                className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Base price (USD)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="99"
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Duration (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Optional for calls/events"
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                <input type="checkbox" checked={isDigital} onChange={(e) => setIsDigital(e.target.checked)} className="accent-amber" />
                Digital delivery
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                <input type="checkbox" checked={requiresBooking} onChange={(e) => setRequiresBooking(e.target.checked)} className="accent-amber" />
                Requires booking schedule
              </label>
            </div>

            {/* Optional media */}
            <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Optional media</p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Service images (max 2)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => {
                    setImageError('')
                    const files = Array.from(e.target.files ?? [])
                    if (files.length > 2) { setImageError('Maximum 2 images allowed.'); return }
                    const oversized = files.find((f) => f.size > 2 * 1024 * 1024)
                    if (oversized) { setImageError('Each image must be under 2MB.'); return }
                    setImageFiles(files)
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-amber file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#07161e] outline-none"
                />
                {imageError && <p className="mt-1 text-[11px] text-red-400">{imageError}</p>}
                <p className="mt-1 text-[11px] text-slate-600">JPG, PNG or WEBP. Max 2MB each. Up to 2 images.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Short video clip (optional)</label>
                <input
                  type="file"
                  accept="video/mp4,video/mov,video/webm"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-amber file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#07161e] outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-600">MP4, MOV or WEBM. Max 50MB.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/celebrity/services" className="btn-outline rounded-xl px-4 py-2 text-sm font-semibold">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-amber px-5 py-2.5 text-sm font-semibold text-[#07161e] transition hover:bg-amber-lt disabled:opacity-60"
              >
                {submitting ? 'Creating service...' : 'Create service'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashShell>
  )
}

