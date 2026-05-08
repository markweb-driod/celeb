'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

const navItems = [
  { href: '/fan/dashboard',       label: 'Overview',        icon: '🏠' },
  { href: '/fan/explore',         label: 'Explore',         icon: '🔍' },
  { href: '/fan/cards',           label: 'Fan Cards',       icon: '🃏' },
  { href: '/fan/orders',          label: 'My Bookings',     icon: '📦' },
  { href: '/fan/subscriptions',   label: 'Subscriptions',   icon: '⭐' },
  { href: '/fan/chat',            label: 'Chat',            icon: '💬' },
  { href: '/fan/tickets',         label: 'Tickets',         icon: '🎟️' },
  { href: '/fan/merch',           label: 'Merch Store',     icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault',           label: 'My Vault',        icon: '🔒' },
  { href: '/fan/profile',         label: 'Profile',         icon: '👤' },
]

type FanProfile = {
  id: number
  display_name: string | null
  avatar_url: string | null
}

type ProfilePayload = { profile: FanProfile }

export default function FanProfilePage() {
  const router = useRouter()
  const [user, setUser]             = useState<AuthUser | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
        setUser(me.data)
        const p = await api.get<ProfilePayload>('/fan/profile')
        setDisplayName(p.data.profile.display_name ?? '')
        setExistingAvatarUrl(p.data.profile.avatar_url ?? null)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const formData = new FormData()
      if (displayName) formData.append('display_name', displayName)
      if (avatarFile) formData.append('avatar_photo', avatarFile)
      await api.put('/fan/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSuccess('Profile saved successfully.')
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const name = displayName || user?.email || 'Fan'
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <DashShell navItems={navItems} userName={name} roleLabel="Fan" accentColor="mint">
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Profile</h1>
            <p className="mt-1 text-sm text-slate-400">Manage your fan account details</p>
          </div>

          {success && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Avatar preview */}
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-6 lg:col-span-1">
              {avatarFile ? (
                <img
                  src={URL.createObjectURL(avatarFile)}
                  alt="New avatar preview"
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-mint/30"
                />
              ) : existingAvatarUrl ? (
                <img
                  src={existingAvatarUrl}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-mint/30"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-mint/40 to-teal-600/40 font-display text-3xl font-bold text-white ring-2 ring-mint/20">
                  {initials}
                </div>
              )}
              <div className="text-center">
                <p className="font-semibold text-white">{name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <span className="mt-2 inline-block rounded-full border border-mint/30 bg-mint/10 px-3 py-0.5 text-[11px] font-semibold text-mint-soft">Fan</span>
              </div>
            </div>

            {/* Edit form */}
            <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-6 lg:col-span-2">
              {/* Read-only email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Email address
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.email ?? ''}
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  maxLength={255}
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-mint/40 focus:ring-1 focus:ring-mint/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Profile photo
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#07161e] outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-600">Max 2MB. JPG, PNG or WEBP. Leave empty to keep current.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setError(''); setSuccess('') }}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-400 transition hover:text-white"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashShell>
  )
}
