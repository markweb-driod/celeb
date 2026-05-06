'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

type ManagedUser = {
  id: number
  email: string
  user_type: 'admin' | 'celebrity' | 'fan'
  status: 'active' | 'suspended' | 'banned'
  celebrityProfile?: {
    stage_name: string
    commission_rate: string
  }
  fanProfile?: {
    display_name: string | null
  }
}

type UsersResponse = {
  users: {
    data: ManagedUser[]
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [q, setQ] = useState('')
  const [loadingAction, setLoadingAction] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadUsers = async (search: string) => {
    const res = await api.get<UsersResponse>('/admin/users', {
      params: search ? { q: search } : undefined,
    })
    setUsers(res.data.users.data)
  }

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
        await loadUsers('')
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const updateStatus = async (target: ManagedUser, status: ManagedUser['status']) => {
    setLoadingAction(target.id)
    setError('')
    try {
      await api.patch(`/admin/users/${target.id}/status`, { status })
      await loadUsers(q)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoadingAction(null)
    }
  }

  const updateCommission = async (target: ManagedUser) => {
    const current = Number(target.celebrityProfile?.commission_rate ?? 15)
    const value = window.prompt('Set commission rate (0-100):', current.toString())
    if (value === null) return

    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      setError('Commission must be a number.')
      return
    }

    setLoadingAction(target.id)
    setError('')
    try {
      await api.patch(`/admin/users/${target.id}/commission`, { commission_rate: parsed })
      await loadUsers(q)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-white">User Management</h1>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search by email"
              className="w-full rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white outline-none focus:border-amber/40"
            />
            <button
              onClick={() => void loadUsers(q)}
              className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-[#07161e]"
            >
              Search
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr] border-b border-white/[0.08] px-4 py-3 text-xs uppercase tracking-widest text-slate-500">
              <p>User</p>
              <p>Role</p>
              <p>Status</p>
              <p>Actions</p>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {users.map((item) => (
                <div key={item.id} className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr] items-center px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-white">{item.email}</p>
                    {item.user_type === 'celebrity' && (
                      <p className="text-xs text-slate-400">{item.celebrityProfile?.stage_name ?? 'Creator'}</p>
                    )}
                    {item.user_type === 'fan' && (
                      <p className="text-xs text-slate-400">{item.fanProfile?.display_name ?? 'Fan'}</p>
                    )}
                  </div>

                  <p className="text-slate-300">{item.user_type}</p>
                  <p className="text-slate-300">{item.status}</p>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      disabled={loadingAction === item.id}
                      onClick={() => void updateStatus(item, 'active')}
                      className="rounded-lg border border-emerald-400/20 px-2 py-1 text-xs text-emerald-300"
                    >
                      Activate
                    </button>
                    <button
                      disabled={loadingAction === item.id}
                      onClick={() => void updateStatus(item, 'suspended')}
                      className="rounded-lg border border-amber/20 px-2 py-1 text-xs text-amber"
                    >
                      Suspend
                    </button>
                    <button
                      disabled={loadingAction === item.id}
                      onClick={() => void updateStatus(item, 'banned')}
                      className="rounded-lg border border-red-400/20 px-2 py-1 text-xs text-red-300"
                    >
                      Ban
                    </button>
                    {item.user_type === 'celebrity' && (
                      <button
                        disabled={loadingAction === item.id}
                        onClick={() => void updateCommission(item)}
                        className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-200"
                      >
                        Commission
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashShell>
  )
}
