'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'

type AdminOrder = {
  id: number
  order_number: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'
  total_amount: string
  currency: string
  created_at: string
  service?: { title: string }
  fan?: { display_name: string | null }
  celebrity?: { stage_name: string }
}

type OrdersResponse = {
  orders: {
    data: AdminOrder[]
  }
}

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: 'A' },
  { href: '/admin/users', label: 'Users', icon: 'U' },
  { href: '/admin/orders', label: 'Orders', icon: 'O' },
  { href: '/admin/reports', label: 'Reports', icon: 'R' },
  { href: '/admin/control', label: 'Control', icon: 'C' },
]

const statusClass: Record<string, string> = {
  pending: 'border-amber/30 bg-amber/10 text-amber',
  confirmed: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
  completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-red-400/30 bg-red-500/10 text-red-300',
  refunded: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

        const orderRes = await api.get<OrdersResponse>('/orders')
        setOrders(orderRes.data.orders.data)
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  return (
    <DashShell navItems={navItems} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-white">Order Oversight</h1>

          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] border-b border-white/[0.08] px-4 py-3 text-xs uppercase tracking-widest text-slate-500">
              <p>Order</p>
              <p>Service</p>
              <p>Fan</p>
              <p>Status</p>
              <p>Total</p>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {orders.map((order) => (
                <div key={order.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-white">{order.order_number}</p>
                    <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-slate-300">{order.service?.title ?? 'Service'}</p>
                  <p className="text-slate-300">{order.fan?.display_name ?? '-'}</p>
                  <div>
                    <span className={`rounded-full border px-2 py-1 text-xs ${statusClass[order.status] ?? statusClass.pending}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="font-semibold text-white">{order.currency} {Number(order.total_amount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashShell>
  )
}
