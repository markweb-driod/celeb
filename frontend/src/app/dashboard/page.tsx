'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AUTH_TOKEN_KEY, api } from '../lib/api'
import { AuthUser } from '../lib/types'

export default function DashboardRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)

      if (!token) {
        router.replace('/login')
        return
      }

      try {
        const response = await api.get<AuthUser>('/auth/me')

        if (response.data.user_type === 'admin') {
          router.replace('/admin/dashboard')
          return
        }

        if (response.data.user_type === 'celebrity') {
          router.replace('/celebrity/dashboard')
          return
        }

        router.replace('/fan/dashboard')
      } catch {
        window.localStorage.removeItem(AUTH_TOKEN_KEY)
        router.replace('/login')
      }
    }

    void run()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-slate-200">
      <div className="glass rounded-2xl px-6 py-5 text-sm">Preparing your dashboard...</div>
    </main>
  )
}
