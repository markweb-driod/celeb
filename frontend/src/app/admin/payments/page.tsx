'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

type Transaction = {
  id: number
  transaction_number: string
  transaction_type: 'payment' | 'refund' | 'payout'
  payment_method: string | null
  amount: string
  currency: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  user: { email: string } | null
  order: {
    order_number: string
    fan: { display_name: string | null } | null
    celebrity: { stage_name: string } | null
  } | null
}

type Payout = {
  id: number
  payout_number: string
  gross_amount: string
  platform_fees: string
  net_amount: string
  status: 'pending' | 'processing' | 'paid' | 'failed'
  stripe_payout_id: string | null
  created_at: string
  celebrity: {
    stage_name: string
    user: { email: string } | null
  } | null
}

type TransactionsResponse = {
  transactions: { data: Transaction[]; last_page: number }
  summary: { total_payments: number; total_refunds: number; pending_count: number; failed_count: number }
}

type PayoutsResponse = {
  payouts: { data: Payout[]; last_page: number }
  payout_summary: { total_gross: number; total_net: number; total_fees: number; pending_count: number }
}

const txTypeClass: Record<string, string> = {
  payment: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  refund:  'border-red-400/30 bg-red-500/10 text-red-300',
  payout:  'border-blue-400/30 bg-blue-500/10 text-blue-300',
}

const txStatusClass: Record<string, string> = {
  completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending:   'border-amber/30 bg-amber/10 text-amber',
  failed:    'border-red-400/30 bg-red-500/10 text-red-300',
}

const payoutStatusClass: Record<string, string> = {
  paid:       'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending:    'border-amber/30 bg-amber/10 text-amber',
  processing: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
  failed:     'border-red-400/30 bg-red-500/10 text-red-300',
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tab, setTab] = useState<'transactions' | 'payouts'>('transactions')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [txSummary, setTxSummary] = useState<TransactionsResponse['summary'] | null>(null)
  const [payoutSummary, setPayoutSummary] = useState<PayoutsResponse['payout_summary'] | null>(null)
  const [txPage, setTxPage] = useState(1)
  const [txLastPage, setTxLastPage] = useState(1)
  const [poPage, setPoPage] = useState(1)
  const [poLastPage, setPoLastPage] = useState(1)
  const [txType, setTxType] = useState('')
  const [txStatus, setTxStatus] = useState('')
  const [poStatus, setPoStatus] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTransactions = async (search: string, type: string, status: string, p: number) => {
    const params: Record<string, string | number> = { per_page: 25, page: p }
    if (search) params.q = search
    if (type)   params.transaction_type = type
    if (status) params.status = status
    const res = await api.get<TransactionsResponse>('/admin/transactions', { params })
    setTransactions(res.data.transactions.data)
    setTxLastPage(res.data.transactions.last_page)
    setTxSummary(res.data.summary)
  }

  const loadPayouts = async (status: string, p: number) => {
    const params: Record<string, string | number> = { per_page: 25, page: p }
    if (status) params.status = status
    const res = await api.get<PayoutsResponse>('/admin/payouts', { params })
    setPayouts(res.data.payouts.data)
    setPoLastPage(res.data.payouts.last_page)
    setPayoutSummary(res.data.payout_summary)
  }

  useEffect(() => {
    const init = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        await Promise.all([loadTransactions('', '', '', 1), loadPayouts('', 1)])
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [router])

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-5">
          <h1 className="font-display text-2xl font-bold text-white">Payments Management</h1>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}

          {/* Summary cards */}
          {tab === 'transactions' && txSummary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total payments', value: `$${txSummary.total_payments.toFixed(2)}`, color: 'text-emerald-400' },
                { label: 'Total refunds',  value: `$${txSummary.total_refunds.toFixed(2)}`,  color: 'text-red-400' },
                { label: 'Net revenue',    value: `$${(txSummary.total_payments - txSummary.total_refunds).toFixed(2)}`, color: 'text-white' },
                { label: 'Pending / Failed', value: `${txSummary.pending_count} / ${txSummary.failed_count}`, color: 'text-amber' },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                  <p className={`mt-2 font-display text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'payouts' && payoutSummary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total gross paid out', value: `$${payoutSummary.total_gross.toFixed(2)}`, color: 'text-white' },
                { label: 'Platform fees earned',  value: `$${payoutSummary.total_fees.toFixed(2)}`,  color: 'text-amber' },
                { label: 'Net paid to creators',  value: `$${payoutSummary.total_net.toFixed(2)}`,   color: 'text-emerald-400' },
                { label: 'Pending payouts',        value: String(payoutSummary.pending_count),        color: 'text-amber' },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                  <p className={`mt-2 font-display text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/[0.07]">
            {(['transactions', 'payouts'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 px-1 text-sm font-semibold capitalize transition border-b-2 -mb-px ${
                  tab === t ? 'border-amber text-amber' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Transactions tab */}
          {tab === 'transactions' && (
            <>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void loadTransactions(q, txType, txStatus, 1)}
                  placeholder="Search transaction #…"
                  className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber/40 w-52"
                />
                <select
                  value={txType}
                  onChange={(e) => { setTxType(e.target.value); void loadTransactions(q, e.target.value, txStatus, 1) }}
                  className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white"
                >
                  <option value="">All types</option>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                  <option value="payout">Payout</option>
                </select>
                <select
                  value={txStatus}
                  onChange={(e) => { setTxStatus(e.target.value); void loadTransactions(q, txType, e.target.value, 1) }}
                  className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white"
                >
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-left">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Transaction #</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">User</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Order</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {transactions.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No transactions found.</td></tr>
                    ) : transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{tx.transaction_number}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${txTypeClass[tx.transaction_type] ?? ''}`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{tx.user?.email ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {tx.order ? (
                            <div>
                              <div>{tx.order.fan?.display_name ?? 'Fan'} → {tx.order.celebrity?.stage_name ?? 'Celeb'}</div>
                              <div className="font-mono">{tx.order.order_number}</div>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">${parseFloat(tx.amount).toFixed(2)} <span className="text-slate-500 text-xs">{tx.currency}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${txStatusClass[tx.status] ?? ''}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {txLastPage > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => { const p = txPage - 1; setTxPage(p); void loadTransactions(q, txType, txStatus, p) }} disabled={txPage === 1} className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white">← Prev</button>
                  <span className="text-sm text-slate-500">Page {txPage} of {txLastPage}</span>
                  <button onClick={() => { const p = txPage + 1; setTxPage(p); void loadTransactions(q, txType, txStatus, p) }} disabled={txPage === txLastPage} className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white">Next →</button>
                </div>
              )}
            </>
          )}

          {/* Payouts tab */}
          {tab === 'payouts' && (
            <>
              <div className="flex flex-wrap gap-2">
                <select
                  value={poStatus}
                  onChange={(e) => { setPoStatus(e.target.value); void loadPayouts(e.target.value, 1) }}
                  className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#071e29]/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-left">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Payout #</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Celebrity</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Gross</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Fees</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Net</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {payouts.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No payouts found.</td></tr>
                    ) : payouts.map((po) => (
                      <tr key={po.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{po.payout_number}</td>
                        <td className="px-4 py-3">
                          <div className="text-white font-semibold">{po.celebrity?.stage_name ?? '—'}</div>
                          <div className="text-xs text-slate-500">{po.celebrity?.user?.email ?? ''}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">${parseFloat(po.gross_amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-500">${parseFloat(po.platform_fees).toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-400">${parseFloat(po.net_amount).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${payoutStatusClass[po.status] ?? ''}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{new Date(po.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {poLastPage > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => { const p = poPage - 1; setPoPage(p); void loadPayouts(poStatus, p) }} disabled={poPage === 1} className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white">← Prev</button>
                  <span className="text-sm text-slate-500">Page {poPage} of {poLastPage}</span>
                  <button onClick={() => { const p = poPage + 1; setPoPage(p); void loadPayouts(poStatus, p) }} disabled={poPage === poLastPage} className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-40 hover:border-amber/30 hover:text-white">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </DashShell>
  )
}
