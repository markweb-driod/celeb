'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashShell from '../../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../../lib/api'
import { AuthUser } from '../../../lib/types'
import { ADMIN_NAV } from '../../nav'

/* ── Types ── */

type CelebrityDetail = {
  id: number
  stage_name: string
  slug: string
  bio: string | null
  category: string | null
  verification_status: 'pending' | 'verified' | 'rejected'
  is_featured: boolean
  commission_rate: string
  profile_image_url: string | null
  cover_image_url: string | null
  social_links: Record<string, string> | null
  rating_average: string
  rating_count: number
  total_orders: number
  completed_orders: number
  total_revenue: number | null
  user: {
    id: number
    email: string
    status: 'active' | 'suspended' | 'banned'
    created_at: string
  }
}

type Service = {
  id: number
  title: string
  description: string | null
  service_type: string
  images: string[] | null
  short_video_url: string | null
  base_price: string
  currency: string
  max_delivery_days: number | null
  status: 'active' | 'inactive' | 'draft'
  orders_count: number
}

type RecentOrder = {
  id: number
  order_number: string
  status: string
  total_amount: string
  created_at: string
  fan: { display_name: string | null } | null
  service: { title: string } | null
}

type DetailResponse = {
  celebrity: CelebrityDetail
  recent_orders: RecentOrder[]
}

type ServicesResponse = { services: Service[] }

const SERVICE_TYPES = [
  'fan_card', 'video_message', 'video_shoutout', 'live_session',
  'exclusive_content', 'meet_greet', 'meet_and_greet', 'private_event',
  'birthday_performance', 'birthday_surprise', 'shoutout',
  'merchandise', 'membership', 'custom',
]

const verificationClass: Record<string, string> = {
  verified: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending:  'border-amber/30 bg-amber/10 text-amber',
  rejected: 'border-red-400/30 bg-red-500/10 text-red-300',
}

const statusClass: Record<string, string> = {
  active:    'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  suspended: 'border-amber/30 bg-amber/10 text-amber',
  banned:    'border-red-400/30 bg-red-500/10 text-red-300',
}

const orderStatusClass: Record<string, string> = {
  pending:   'border-amber/30 bg-amber/10 text-amber',
  confirmed: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
  completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-red-400/30 bg-red-500/10 text-red-300',
  refunded:  'border-slate-400/30 bg-slate-500/10 text-slate-300',
}

const serviceStatusClass: Record<string, string> = {
  active:   'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  inactive: 'border-slate-400/30 bg-slate-500/10 text-slate-400',
  draft:    'border-amber/30 bg-amber/10 text-amber',
}

/* ── Service form modal ── */

type ServiceFormProps = {
  initial?: Service
  onSave: (data: FormData) => Promise<void>
  onClose: () => void
}

function ServiceFormModal({ initial, onSave, onClose }: ServiceFormProps) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    service_type: initial?.service_type ?? 'video_shoutout',
    base_price: initial?.base_price ?? '',
    currency: initial?.currency ?? 'USD',
    max_delivery_days: initial?.max_delivery_days?.toString() ?? '3',
    status: initial?.status ?? 'active',
  })
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    if (imageFiles.length > 2) {
      setErr('You can upload at most 2 images per service.')
      setSaving(false)
      return
    }

    const tooBig = imageFiles.find((file) => file.size > 2 * 1024 * 1024)
    if (tooBig) {
      setErr('Each image must be 2MB or smaller.')
      setSaving(false)
      return
    }

    const data = new FormData()
    data.append('title', form.title)
    data.append('description', form.description)
    data.append('service_type', form.service_type)
    data.append('base_price', form.base_price)
    data.append('currency', form.currency)
    data.append('max_delivery_days', form.max_delivery_days)
    data.append('status', form.status)

    imageFiles.forEach((file) => {
      data.append('images_upload[]', file)
    })

    if (videoFile) data.append('service_video', videoFile)

    try {
      await onSave(data)
      onClose()
    } catch (e) {
      setErr(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-8">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.09] bg-[#071e29] shadow-2xl sm:max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <p className="font-display font-bold text-white">{initial ? 'Edit Service' : 'Add Service'}</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Title *</label>
              <input required value={form.title} onChange={e => set('title', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Service Type *</label>
              <select value={form.service_type} onChange={e => set('service_type', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40">
                {SERVICE_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Price *</label>
              <input required type="number" min="0" step="0.01" value={form.base_price} onChange={e => set('base_price', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Currency</label>
              <input value={form.currency} onChange={e => set('currency', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Delivery Days</label>
              <input type="number" min="1" value={form.max_delivery_days} onChange={e => set('max_delivery_days', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Service Images (optional)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={e => setImageFiles(Array.from(e.target.files ?? []))}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40"
              />
              <p className="mt-1 text-[11px] text-slate-500">Up to 2 images, max 2MB each. Images only (JPG, PNG, WEBP).</p>
              {!!initial?.images?.length && imageFiles.length === 0 && (
                <p className="mt-1 text-[11px] text-slate-500">Leave empty to keep existing service images.</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Short Video Clip (optional)</label>
              <input
                type="file"
                accept="video/mp4,video/mov,video/webm"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-amber file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#07161e] outline-none focus:border-amber/40"
              />
              <p className="mt-1 text-[11px] text-slate-500">MP4, MOV or WEBM. Max 50MB.{initial?.short_video_url && !videoFile ? ' Leave empty to keep existing video.' : ''}</p>
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:border-white/20 hover:text-white">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-amber py-2.5 text-sm font-bold text-[#07161e] disabled:opacity-60">
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main page ── */

export default function AdminCelebrityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [user, setUser] = useState<AuthUser | null>(null)
  const [celeb, setCeleb] = useState<CelebrityDetail | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    stage_name: '', bio: '', category: '',
    commission_rate: '', verification_status: 'pending',
    is_featured: false,
  })
  const [existingProfileImageUrl, setExistingProfileImageUrl] = useState<string | null>(null)
  const [existingCoverImageUrl, setExistingCoverImageUrl] = useState<string | null>(null)
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)

  // Service modal
  const [serviceModal, setServiceModal] = useState<{ open: boolean; editing?: Service }>({ open: false })

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  const loadDetail = async () => {
    const [detailRes, svcRes] = await Promise.all([
      api.get<DetailResponse>(`/admin/celebrities/${id}`),
      api.get<ServicesResponse>(`/admin/celebrities/${id}/services`),
    ])
    const c = detailRes.data.celebrity
    setCeleb(c)
    setRecentOrders(detailRes.data.recent_orders)
    setServices(svcRes.data.services)
    setProfileForm({
      stage_name: c.stage_name,
      bio: c.bio ?? '',
      category: c.category ?? '',
      commission_rate: c.commission_rate,
      verification_status: c.verification_status,
      is_featured: c.is_featured,
    })
    setExistingProfileImageUrl(c.profile_image_url ?? null)
    setExistingCoverImageUrl(c.cover_image_url ?? null)
    setProfilePhotoFile(null)
    setCoverPhotoFile(null)
  }

  useEffect(() => {
    const init = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        await loadDetail()
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  /* ── Profile save ── */
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const formData = new FormData()
      formData.append('stage_name', profileForm.stage_name)
      formData.append('bio', profileForm.bio)
      formData.append('category', profileForm.category)
      formData.append('commission_rate', profileForm.commission_rate)
      formData.append('verification_status', profileForm.verification_status)
      formData.append('is_featured', profileForm.is_featured ? '1' : '0')
      if (profilePhotoFile) formData.append('profile_photo', profilePhotoFile)
      if (coverPhotoFile) formData.append('cover_photo', coverPhotoFile)
      await api.patch(`/admin/celebrities/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadDetail()
      flash('Profile saved.')
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  /* ── Account status ── */
  const setAccountStatus = async (status: string) => {
    setSaving(true); setError('')
    try {
      await api.patch(`/admin/celebrities/${id}/user-status`, { status })
      await loadDetail()
      flash('Account status updated.')
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  /* ── Service actions ── */
  const addService = async (data: FormData) => {
    await api.post(`/admin/celebrities/${id}/services`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    await loadDetail()
    flash('Service added.')
  }

  const editService = async (svcId: number, data: FormData) => {
    await api.patch(`/admin/celebrities/${id}/services/${svcId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    await loadDetail()
    flash('Service updated.')
  }

  const deleteService = async (svc: Service) => {
    if (!window.confirm(`Delete service "${svc.title}"?`)) return
    setError('')
    try {
      await api.delete(`/admin/celebrities/${id}/services/${svc.id}`)
      await loadDetail()
      flash('Service deleted.')
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  const toggleServiceStatus = async (svc: Service) => {
    const next = svc.status === 'active' ? 'inactive' : 'active'
    setError('')
    try {
      await api.patch(`/admin/celebrities/${id}/services/${svc.id}`, { status: next })
      await loadDetail()
      flash(`Service ${next}.`)
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  /* ── Delete celebrity ── */
  const deleteCeleb = async () => {
    if (!window.confirm(`Delete ${celeb?.stage_name}? This removes the user account too and cannot be undone.`)) return
    setError('')
    try {
      await api.delete(`/admin/celebrities/${id}`)
      router.push('/admin/celebrities')
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  if (loading) return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      <div className="flex h-40 items-center justify-center text-slate-400">Loading…</div>
    </DashShell>
  )

  if (!celeb) return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error || 'Celebrity not found.'}</div>
    </DashShell>
  )

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">

      {serviceModal.open && (
        <ServiceFormModal
          initial={serviceModal.editing}
          onSave={serviceModal.editing
            ? (data) => editService(serviceModal.editing!.id, data)
            : addService}
          onClose={() => setServiceModal({ open: false })}
        />
      )}

      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button onClick={() => router.push('/admin/celebrities')}
              className="mb-2 text-xs text-slate-500 hover:text-white">← All Celebrities</button>
            <h1 className="font-display text-2xl font-bold text-white">{celeb.stage_name}</h1>
            <p className="text-sm text-slate-500">{celeb.user.email}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${verificationClass[celeb.verification_status]}`}>
              {celeb.verification_status}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[celeb.user.status]}`}>
              {celeb.user.status}
            </span>
            {celeb.is_featured && (
              <span className="rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs font-semibold text-amber">⭐ Featured</span>
            )}
          </div>
        </div>

        {error   && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Orders', value: celeb.total_orders },
            { label: 'Completed', value: celeb.completed_orders },
            { label: 'Revenue', value: `$${(celeb.total_revenue ?? 0).toFixed(2)}` },
            { label: 'Rating', value: `${celeb.rating_average} (${celeb.rating_count})` },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* LEFT: profile + services */}
          <div className="space-y-6">

            {/* Profile edit */}
            <form onSubmit={saveProfile} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5 space-y-4">
              <h2 className="font-display font-bold text-white">Profile</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Stage Name</label>
                  <input value={profileForm.stage_name} onChange={e => setProfileForm(f => ({ ...f, stage_name: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Category</label>
                  <input value={profileForm.category} onChange={e => setProfileForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Music, Sports"
                    className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Bio</label>
                  <textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} rows={4}
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Profile Photo</label>
                  {existingProfileImageUrl && !profilePhotoFile && (
                    <img src={existingProfileImageUrl} alt="Current profile" className="mb-1.5 h-12 w-12 rounded-full object-cover ring-2 ring-amber/30" />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setProfilePhotoFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-amber file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#07161e] outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-600">Max 2MB. Leave empty to keep current.</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Cover Photo</label>
                  {existingCoverImageUrl && !coverPhotoFile && (
                    <img src={existingCoverImageUrl} alt="Current cover" className="mb-1.5 h-8 w-full rounded-lg object-cover ring-1 ring-amber/20" />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setCoverPhotoFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-amber file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#07161e] outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-600">Max 2MB. Leave empty to keep current.</p>
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="rounded-xl bg-amber px-5 py-2.5 text-sm font-bold text-[#07161e] disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </form>

            {/* Services / Payment items */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-white">Services (Payment Items)</h2>
                <button
                  onClick={() => setServiceModal({ open: true })}
                  className="rounded-xl bg-amber px-3 py-1.5 text-xs font-bold text-[#07161e] hover:opacity-90"
                >
                  + Add Service
                </button>
              </div>

              {services.length === 0 ? (
                <p className="text-sm text-slate-500">No services yet. Add one above.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left">
                        <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Title</th>
                        <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Media</th>
                        <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Type</th>
                        <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Price</th>
                        <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Days</th>
                        <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Orders</th>
                        <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Status</th>
                        <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {services.map(svc => (
                        <tr key={svc.id} className="hover:bg-white/[0.02]">
                          <td className="py-2 pr-3">
                            <p className="font-semibold text-white">{svc.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{svc.description ?? '—'}</p>
                          </td>
                          <td className="py-2 pr-3 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <span>{svc.images?.length ?? 0} img</span>
                              <span>·</span>
                              <span>{svc.short_video_url ? 'video' : 'no video'}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-xs capitalize text-slate-400">{svc.service_type.replace(/_/g, ' ')}</td>
                          <td className="py-2 pr-3 font-semibold text-amber">{svc.currency} {Number(svc.base_price).toFixed(2)}</td>
                          <td className="py-2 pr-3 text-slate-400">{svc.max_delivery_days ?? '—'}</td>
                          <td className="py-2 pr-3 text-slate-400">{svc.orders_count}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${serviceStatusClass[svc.status]}`}>
                              {svc.status}
                            </span>
                          </td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => setServiceModal({ open: true, editing: svc })}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:border-amber/30 hover:text-amber"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => void toggleServiceStatus(svc)}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-400 hover:border-amber/20 hover:text-amber"
                              >
                                {svc.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => void deleteService(svc)}
                                className="rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/15"
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5 space-y-4">
              <h2 className="font-display font-bold text-white">Recent Orders</h2>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-slate-500">No orders yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Order</th>
                      <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Service</th>
                      <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Fan</th>
                      <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Status</th>
                      <th className="pb-2 text-[11px] uppercase tracking-widest text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {recentOrders.map(o => (
                      <tr key={o.id}>
                        <td className="py-2 pr-3">
                          <p className="font-mono text-xs text-white">{o.order_number}</p>
                          <p className="text-[11px] text-slate-500">{new Date(o.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="py-2 pr-3 text-slate-300">{o.service?.title ?? '—'}</td>
                        <td className="py-2 pr-3 text-slate-400">{o.fan?.display_name ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${orderStatusClass[o.status] ?? ''}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2 font-semibold text-white">${Number(o.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* RIGHT: sales settings + account */}
          <div className="space-y-4">

            {/* Sales settings */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5 space-y-4">
              <h2 className="font-display font-bold text-white">Sales Settings</h2>

              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Commission Rate (%)</label>
                <div className="flex gap-2">
                  <input type="number" min="0" max="100" step="0.01"
                    value={profileForm.commission_rate}
                    onChange={e => setProfileForm(f => ({ ...f, commission_rate: e.target.value }))}
                    className="flex-1 rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40" />
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-xl bg-amber px-3 py-2 text-xs font-bold text-[#07161e] disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Platform keeps this % of each completed order.</p>
              </div>

              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">Verification Status</label>
                <div className="flex gap-2">
                  <select
                    value={profileForm.verification_status}
                    onChange={e => setProfileForm(f => ({ ...f, verification_status: e.target.value }))}
                    className="flex-1 rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-amber/40"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-xl bg-amber px-3 py-2 text-xs font-bold text-[#07161e] disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Featured</p>
                  <p className="text-[11px] text-slate-500">Shows on homepage featured section</p>
                </div>
                <button
                  onClick={() => {
                    setProfileForm(f => ({ ...f, is_featured: !f.is_featured }))
                    void api.patch(`/admin/celebrities/${id}`, { is_featured: !profileForm.is_featured })
                      .then(() => void loadDetail().then(() => flash('Featured status updated.')))
                  }}
                  className={`relative h-6 w-11 rounded-full transition-colors ${profileForm.is_featured ? 'bg-amber' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${profileForm.is_featured ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Account */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5 space-y-3">
              <h2 className="font-display font-bold text-white">Account</h2>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="text-white font-mono text-xs">{celeb.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Joined</span>
                  <span className="text-slate-300 text-xs">{new Date(celeb.user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[celeb.user.status]}`}>{celeb.user.status}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                {celeb.user.status === 'active' ? (
                  <>
                    <button
                      onClick={() => void setAccountStatus('suspended')}
                      disabled={saving}
                      className="rounded-xl border border-amber/30 bg-amber/10 py-2 text-xs font-semibold text-amber hover:bg-amber/20 disabled:opacity-50"
                    >
                      Suspend Account
                    </button>
                    <button
                      onClick={() => void setAccountStatus('banned')}
                      disabled={saving}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Ban Account
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => void setAccountStatus('active')}
                    disabled={saving}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    Reactivate Account
                  </button>
                )}
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-2">
              <h2 className="text-sm font-bold text-red-400">Danger Zone</h2>
              <p className="text-[11px] text-slate-500">Deletes the celebrity profile and user account permanently.</p>
              <button
                onClick={deleteCeleb}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/20"
              >
                Delete Celebrity
              </button>
            </div>

          </div>
        </div>
      </div>
    </DashShell>
  )
}
