'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

/* ── Types ── */

type TxStatus = 'pending' | 'pending_confirmation' | 'completed' | 'failed'

type Transaction = {
  id: number
  transaction_number: string
  transaction_type: 'payment' | 'refund' | 'payout'
  payment_method: string | null
  amount: string
  currency: string
  status: TxStatus
  proof_url: string | null
  gift_card_code: string | null
  payment_meta: Record<string, string> | null
  admin_note: string | null
  confirmed_at: string | null
  created_at: string
  user: { email: string } | null
  order: {
    id: number
    order_number: string
    total_amount: string
    status: string
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
  created_at: string
  celebrity: { stage_name: string; user: { email: string } | null } | null
}

type TxSummary = {
  total_payments: number
  total_refunds: number
  pending_confirmation_count: number
  pending_count: number
  failed_count: number
}

type TransactionsResponse = {
  transactions: { data: Transaction[]; last_page: number }
  summary: TxSummary
}

type PayoutsResponse = {
  payouts: { data: Payout[]; last_page: number }
  payout_summary: { total_gross: number; total_net: number; total_fees: number; pending_count: number }
}

/* ── Style helpers ── */

const txTypeClass: Record<string, string> = {
  payment: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  refund:  'border-red-400/30 bg-red-500/10 text-red-300',
  payout:  'border-blue-400/30 bg-blue-500/10 text-blue-300',
}

const txStatusClass: Record<string, string> = {
  completed:            'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending_confirmation: 'border-amber/30 bg-amber/10 text-amber',
  pending:              'border-slate-400/30 bg-slate-500/10 text-slate-300',
  failed:               'border-red-400/30 bg-red-500/10 text-red-300',
}

const payoutStatusClass: Record<string, string> = {
  paid:       'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  pending:    'border-amber/30 bg-amber/10 text-amber',
  processing: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
  failed:     'border-red-400/30 bg-red-500/10 text-red-300',
}

const METHOD_ICONS: Record<string, string> = {
  paypal: '🅿️', zelle: '💜', cashapp: '💚', venmo: '🔵',
  apple_pay: '🍎', google_pay: '🔴',
  crypto_btc: '₿', crypto_eth: '⟠', crypto_usdt: '💲',
  gift_card: '🎁',
}

const getSafeProofUrl = (url: string | null): string | null => {
  if (!url) return null
  return /^\/storage\/payment-proofs\/[A-Za-z0-9_.\/-]+$/.test(url) ? url : null
}

/* ── Pending Confirmation Detail Modal ── */

function PendingModal({
  tx,
  onConfirm,
  onReject,
  onClose,
}: {
  tx: Transaction
  onConfirm: (note: string) => Promise<void>
  onReject: (note: string) => Promise<void>
  onClose: () => void
}) {
  const [note, setNote] = useState('')
  const [acting, setActing] = useState(false)
  const [err, setErr] = useState('')
  const safeProofUrl = getSafeProofUrl(tx.proof_url)

  const act = async (fn: (note: string) => Promise<void>) => {
    setActing(true)
    setErr('')
    try {
      await fn(note)
      onClose()
    } catch (e) {
      setErr(getApiErrorMessage(e))
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-[#071e29] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <p className="font-display font-bold text-white">Payment Review</p>
            <p className="font-mono text-xs text-slate-500">{tx.transaction_number}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-4 p-5">
          {/* Order & user info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Fan</p>
              <p className="text-white">{tx.order?.fan?.display_name ?? tx.user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Celebrity</p>
              <p className="text-white">{tx.order?.celebrity?.stage_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Order</p>
              <p className="font-mono text-xs text-slate-300">{tx.order?.order_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Amount</p>
              <p className="font-bold text-amber">${parseFloat(tx.amount).toFixed(2)} {tx.currency}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Method</p>
              <p className="text-white">{METHOD_ICONS[tx.payment_method ?? ''] ?? '💳'} {tx.payment_method?.replace(/_/g, ' ') ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Submitted</p>
              <p className="text-slate-300 text-xs">{new Date(tx.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Gift card code */}
          {tx.gift_card_code && (
            <div className="rounded-xl border border-amber/20 bg-amber/5 p-3">
              <p className="text-[11px] uppercase tracking-widest text-amber mb-1">Gift Card Code</p>
              <p className="font-mono text-sm font-bold text-white select-all">{tx.gift_card_code}</p>
            </div>
          )}

          {/* Proof image */}
          {safeProofUrl && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Payment Proof</p>
              {safeProofUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={safeProofUrl}
                  alt="Payment proof"
                  className="max-h-48 w-full rounded-xl object-contain border border-white/10 bg-[#05131b]"
                />
              ) : (
                <a
                  href={safeProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-mint/30 px-4 py-2 text-sm font-semibold text-mint hover:bg-mint/10"
                >
                  📄 View uploaded proof
                </a>
              )}
            </div>
          )}

          {/* Notes from fan */}
          {tx.payment_meta?.notes && (
            <div className="rounded-xl border border-white/10 bg-[#05131b] p-3">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Fan's notes</p>
              <p className="text-sm text-slate-300">{tx.payment_meta.notes}</p>
            </div>
          )}

          {/* Admin note input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Admin note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Reason for rejection, or confirmation note…"
              className="w-full resize-none rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-amber/40"
            />
          </div>

          {err && <p className="text-sm text-red-400">{err}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => void act(onConfirm)}
              disabled={acting}
              className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-60"
            >
              ✓ Confirm Payment
            </button>
            <button
              onClick={() => void act(onReject)}
              disabled={acting}
              className="flex-1 rounded-xl border border-red-500/40 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 disabled:opacity-60"
            >
              ✕ Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tab, setTab] = useState<'pending' | 'all' | 'payouts'>('pending')

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingTx, setPendingTx] = useState<Transaction[]>([])
  const [txSummary, setTxSummary] = useState<TxSummary | null>(null)
  const [txPage, setTxPage] = useState(1)
  const [txLastPage, setTxLastPage] = useState(1)
  const [txType, setTxType] = useState('')
  const [txStatus, setTxStatus] = useState('')
  const [q, setQ] = useState('')

  // Payouts state
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [payoutSummary, setPayoutSummary] = useState<PayoutsResponse['payout_summary'] | null>(null)
  const [poPage, setPoPage] = useState(1)
  const [poLastPage, setPoLastPage] = useState(1)
  const [poStatus, setPoStatus] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null)

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

  const loadPending = async () => {
    const res = await api.get<TransactionsResponse>('/admin/transactions', {
      params: { status: 'pending_confirmation', per_page: 50 },
    })
    setPendingTx(res.data.transactions.data)
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
        await Promise.all([loadPending(), loadPayouts('', 1)])
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [router])

  // When switching to "all" tab, load transactions if needed
  useEffect(() => {
    if (tab === 'all' && transactions.length === 0) {
      void loadTransactions('', '', '', 1).catch((e) => setError(getApiErrorMessage(e)))
    }
  }, [tab])

  const handleConfirm = async (txId: number, note: string) => {
    await api.post(`/admin/transactions/${txId}/confirm`, { admin_note: note })
    await loadPending()
  }

  const handleReject = async (txId: number, note: string) => {
    await api.post(`/admin/transactions/${txId}/reject`, { admin_note: note })
    await loadPending()
  }

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-5">
          <h1 className="font-display text-2xl font-bold text-white">Payments Management</h1>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}

          {/* KPI cards */}
          {txSummary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Total collected',   value: `$${txSummary.total_payments.toFixed(2)}`,          color: 'text-emerald-400' },
                { label: 'Total refunded',     value: `$${txSummary.total_refunds.toFixed(2)}`,           color: 'text-red-400' },
                { label: 'Net revenue',        value: `$${(txSummary.total_payments - txSummary.total_refunds).toFixed(2)}`, color: 'text-white' },
                { label: 'Awaiting review',    value: String(txSummary.pending_confirmation_count),       color: 'text-amber', alert: txSummary.pending_confirmation_count > 0 },
                { label: 'Failed payments',    value: String(txSummary.failed_count),                     color: 'text-red-400' },
              ].map((card) => (
                <div key={card.label} className={`rounded-2xl border p-4 ${card.alert ? 'border-amber/40 bg-amber/5' : 'border-white/[0.07] bg-[#071e29]/70'}`}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                  <p className={`mt-2 font-display text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/[0.07]">
            {([
              { key: 'pending', label: `Pending Review${txSummary?.pending_confirmation_count ? ` (${txSummary.pending_confirmation_count})` : ''}` },
              { key: 'all',     label: 'All Payments' },
              { key: 'payouts', label: 'Payouts' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-2 px-1 text-sm font-semibold transition border-b-2 -mb-px ${
                  tab === t.key ? 'border-amber text-amber' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Pending Review tab ── */}
          {tab === 'pending' && (
            <>
              {pendingTx.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 px-5 py-12 text-center">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="font-semibold text-white">No pending payments</p>
                  <p className="text-sm text-slate-500 mt-1">All payments have been reviewed.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {pendingTx.map((tx) => (
                    <div key={tx.id} className="rounded-2xl border border-amber/20 bg-[#071e29]/80 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs text-slate-500">{tx.transaction_number}</p>
                          <p className="font-bold text-amber text-lg">${parseFloat(tx.amount).toFixed(2)} {tx.currency}</p>
                          <p className="text-sm text-white mt-0.5">{METHOD_ICONS[tx.payment_method ?? ''] ?? '💳'} {tx.payment_method?.replace(/_/g, ' ') ?? 'Unknown method'}</p>
                        </div>
                        <span className="inline-block rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[11px] font-semibold text-amber">
                          pending review
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <div><span className="text-slate-600">Fan: </span>{tx.order?.fan?.display_name ?? tx.user?.email ?? '—'}</div>
                        <div><span className="text-slate-600">Creator: </span>{tx.order?.celebrity?.stage_name ?? '—'}</div>
                        <div className="col-span-2"><span className="text-slate-600">Order: </span><span className="font-mono">{tx.order?.order_number ?? '—'}</span></div>
                        <div className="col-span-2"><span className="text-slate-600">Submitted: </span>{new Date(tx.created_at).toLocaleString()}</div>
                      </div>

                      {tx.gift_card_code && (
                        <div className="rounded-lg border border-amber/20 bg-amber/5 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest text-amber">Gift Card Code</p>
                          <p className="font-mono text-sm font-bold text-white select-all">{tx.gift_card_code}</p>
                        </div>
                      )}

                      {getSafeProofUrl(tx.proof_url) && (
                        <p className="text-xs text-mint">
                          📎 <a href={getSafeProofUrl(tx.proof_url) ?? '#'} target="_blank" rel="noreferrer" className="underline hover:text-mint/80">View proof</a>
                        </p>
                      )}

                      <button
                        onClick={() => setReviewTx(tx)}
                        className="w-full rounded-xl border border-amber/30 py-2 text-sm font-semibold text-amber hover:bg-amber/10 transition"
                      >
                        Review & Process →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── All Payments tab ── */}
          {tab === 'all' && (
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
                </select>
                <select
                  value={txStatus}
                  onChange={(e) => { setTxStatus(e.target.value); void loadTransactions(q, txType, e.target.value, 1) }}
                  className="rounded-xl border border-white/10 bg-[#071e29] px-3 py-2 text-sm text-white"
                >
                  <option value="">All statuses</option>
                  <option value="pending_confirmation">Pending review</option>
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
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Method</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">User / Order</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {transactions.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No transactions found.</td></tr>
                    ) : transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{tx.transaction_number}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${txTypeClass[tx.transaction_type] ?? ''}`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {tx.payment_method ? `${METHOD_ICONS[tx.payment_method] ?? ''} ${tx.payment_method.replace(/_/g, ' ')}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          <div>{tx.user?.email ?? '—'}</div>
                          {tx.order && <div className="font-mono">{tx.order.order_number}</div>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">${parseFloat(tx.amount).toFixed(2)} <span className="text-slate-500 text-xs">{tx.currency}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${txStatusClass[tx.status] ?? ''}`}>
                            {tx.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {tx.status === 'pending_confirmation' && (
                            <button
                              onClick={() => setReviewTx(tx)}
                              className="rounded-lg border border-amber/30 px-2 py-1 text-[11px] font-semibold text-amber hover:bg-amber/10"
                            >
                              Review
                            </button>
                          )}
                        </td>
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

          {/* ── Payouts tab ── */}
          {tab === 'payouts' && (
            <>
              {payoutSummary && (
                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Total gross paid', value: `$${payoutSummary.total_gross.toFixed(2)}`, color: 'text-white' },
                    { label: 'Platform fees',     value: `$${payoutSummary.total_fees.toFixed(2)}`,  color: 'text-amber' },
                    { label: 'Net to creators',   value: `$${payoutSummary.total_net.toFixed(2)}`,   color: 'text-emerald-400' },
                    { label: 'Pending payouts',   value: String(payoutSummary.pending_count),        color: 'text-amber' },
                  ].map((c) => (
                    <div key={c.label} className="rounded-2xl border border-white/[0.07] bg-[#071e29]/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{c.label}</p>
                      <p className={`mt-2 font-display text-2xl font-bold ${c.color}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
              )}

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
                          <div className="font-semibold text-white">{po.celebrity?.stage_name ?? '—'}</div>
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

      {/* Review modal */}
      {reviewTx && (
        <PendingModal
          tx={reviewTx}
          onConfirm={(note) => handleConfirm(reviewTx.id, note)}
          onReject={(note) => handleReject(reviewTx.id, note)}
          onClose={() => setReviewTx(null)}
        />
      )}
    </DashShell>
  )
}
