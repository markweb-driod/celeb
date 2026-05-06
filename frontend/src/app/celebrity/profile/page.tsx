'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type CreatorProfile = {
  stage_name: string
  category: string
  bio: string | null
  profile_image_url: string | null
  cover_image_url: string | null
  social_links: unknown
}

type ProfilePayload = { profile: CreatorProfile }

const navItems = [
  { href: '/celebrity/dashboard', label: 'Overview', icon: 'OV' },
  { href: '/celebrity/services', label: 'Services', icon: 'SV' },
  { href: '/celebrity/orders', label: 'Orders', icon: 'OR' },
  { href: '/celebrity/earnings', label: 'Earnings', icon: 'EC' },
  { href: '/celebrity/chat',      label: 'Fan Chat',   icon: 'CH' },
  { href: '/celebrity/profile', label: 'Profile', icon: 'PR' },
]

function parseSocialLinks(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'url' in item) {
          return String((item as { url: unknown }).url)
        }
        return ''
      })
      .filter(Boolean)
  }
  return []
}

export default function CelebrityProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [bio, setBio] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [xUrl, setXUrl] = useState('')

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

        const profileRes = await api.get<ProfilePayload>('/celebrity/profile')
        const profile = profileRes.data.profile
        setBio(profile.bio ?? '')
        setProfileImageUrl(profile.profile_image_url ?? '')
        setCoverImageUrl(profile.cover_image_url ?? '')

        const links = parseSocialLinks(profile.social_links)
        setInstagramUrl(links.find((link) => link.includes('instagram.com')) ?? '')
        setYoutubeUrl(links.find((link) => link.includes('youtube.com') || link.includes('youtu.be')) ?? '')
        setTiktokUrl(links.find((link) => link.includes('tiktok.com')) ?? '')
        setXUrl(links.find((link) => link.includes('x.com') || link.includes('twitter.com')) ?? '')
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const socialLinks = [instagramUrl, youtubeUrl, tiktokUrl, xUrl].map((link) => link.trim()).filter(Boolean)

      await api.put('/celebrity/profile', {
        bio: bio.trim() || null,
        profile_image_url: profileImageUrl.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        social_links: socialLinks,
      })

      setSuccess('Profile updated successfully.')
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const stageName = user?.celebrity_profile?.stage_name ?? user?.celebrityProfile?.stage_name ?? user?.email ?? 'Creator'
  const category = user?.celebrity_profile?.category ?? user?.celebrityProfile?.category ?? 'Creator'

  return (
    <DashShell navItems={navItems} userName={stageName} roleLabel="Creator" accentColor="amber">
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber">Profile center</p>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Creator profile settings</h1>
          </div>

          {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-300">{success}</div>}

          <form onSubmit={onSave} className="space-y-5 rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Stage name</label>
                <input value={stageName} readOnly className="w-full rounded-xl border border-white/10 bg-[#03111a] px-3 py-3 text-sm text-slate-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Category</label>
                <input value={category} readOnly className="w-full rounded-xl border border-white/10 bg-[#03111a] px-3 py-3 text-sm text-slate-300" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                placeholder="Tell fans who you are, what they can request, and your signature style."
                className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Profile image URL</label>
                <input
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  type="url"
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Cover image URL</label>
                <input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  type="url"
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Social links</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} type="url" placeholder="Instagram URL" className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60" />
                <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} type="url" placeholder="YouTube URL" className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60" />
                <input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} type="url" placeholder="TikTok URL" className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60" />
                <input value={xUrl} onChange={(e) => setXUrl(e.target.value)} type="url" placeholder="X / Twitter URL" className="w-full rounded-xl border border-white/10 bg-[#050f17] px-3 py-3 text-sm text-white outline-none focus:border-amber/60" />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-amber px-5 py-2.5 text-sm font-semibold text-[#07161e] transition hover:bg-amber-lt disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashShell>
  )
}

