'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api } from '../../lib/api'
import { AuthUser } from '../../lib/types'

const navItems = [
  { href: '/fan/dashboard',     label: 'Overview',       icon: '🏠' },
  { href: '/fan/explore',       label: 'Explore',        icon: '🔍' },
  { href: '/fan/orders',        label: 'My Bookings',    icon: '📦' },
  { href: '/fan/subscriptions', label: 'Subscriptions',  icon: '⭐' },
  { href: '/fan/chat',          label: 'Chat',           icon: '💬' },
  { href: '/fan/tickets',       label: 'Tickets',        icon: '🎟️' },
  { href: '/fan/merch',         label: 'Merch Store',    icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault',         label: 'My Vault',       icon: '🔒' },
  { href: '/fan/profile',       label: 'Profile',        icon: '👤' },
]

type MerchItem = {
  id: number
  name: string
  celebrity: string
  category: string
  price: number
  currency: string
  image: string
  gradient: string
  sizes?: string[]
  stock: number
  tag?: string
}

const MERCH: MerchItem[] = [
  { id: 1,  name: 'Neon Nights Tour Tee',         celebrity: 'DJ Neon',    category: 'Apparel',     price: 42,  currency: 'USD', image: '👕', gradient: 'from-cyan-500 to-teal-600',      sizes: ['XS','S','M','L','XL','2XL'], stock: 120, tag: 'Best Seller' },
  { id: 2,  name: 'Luna Kira Signed Vinyl',        celebrity: 'Luna Kira', category: 'Collectible', price: 89,  currency: 'USD', image: '🎵', gradient: 'from-rose-500 to-pink-600',      stock: 15, tag: 'Limited' },
  { id: 3,  name: 'Zara Voss Autograph Print',     celebrity: 'Zara Voss', category: 'Collectible', price: 65,  currency: 'USD', image: '🖼️', gradient: 'from-violet-500 to-purple-600',  stock: 40 },
  { id: 4,  name: 'Marcus J Pro Jersey',           celebrity: 'Marcus J',  category: 'Apparel',     price: 110, currency: 'USD', image: '🏀', gradient: 'from-emerald-500 to-green-600',  sizes: ['S','M','L','XL','2XL'], stock: 60 },
  { id: 5,  name: 'DJ Neon Glow Cap',              celebrity: 'DJ Neon',   category: 'Accessories', price: 35,  currency: 'USD', image: '🧢', gradient: 'from-cyan-500 to-teal-600',      stock: 200 },
  { id: 6,  name: 'Luna — Moonrise Hoodie',        celebrity: 'Luna Kira', category: 'Apparel',     price: 78,  currency: 'USD', image: '🌙', gradient: 'from-rose-500 to-pink-600',      sizes: ['XS','S','M','L','XL'], stock: 80, tag: 'New' },
  { id: 7,  name: 'CelebStarsHub Fan Digital NFT',      celebrity: 'Various',   category: 'Digital',     price: 29,  currency: 'USD', image: '💎', gradient: 'from-amber to-orange-500',       stock: 999, tag: 'Digital' },
  { id: 8,  name: 'Jake Blaze Comedy Tour Mug',    celebrity: 'Jake Blaze',category: 'Accessories', price: 22,  currency: 'USD', image: '☕', gradient: 'from-amber to-orange-500',       stock: 180 },
  { id: 9,  name: 'StreamKing Gaming Mouse Pad',   celebrity: 'StreamKing',category: 'Accessories', price: 28,  currency: 'USD', image: '🖱️', gradient: 'from-indigo-500 to-blue-600',    stock: 350 },
  { id: 10, name: 'Zara Voss Perfume (50ml)',       celebrity: 'Zara Voss', category: 'Lifestyle',   price: 145, currency: 'USD', image: '✨', gradient: 'from-violet-500 to-purple-600',  stock: 30, tag: 'Exclusive' },
  { id: 11, name: 'Luna Kira Piano Chord Book',    celebrity: 'Luna Kira', category: 'Digital',     price: 19,  currency: 'USD', image: '📖', gradient: 'from-rose-500 to-pink-600',      stock: 999, tag: 'Digital' },
  { id: 12, name: 'Marcus J Training Programme',  celebrity: 'Marcus J',  category: 'Digital',     price: 49,  currency: 'USD', image: '💪', gradient: 'from-emerald-500 to-green-600',  stock: 999, tag: 'Digital' },
]

const CATS = ['All', 'Apparel', 'Collectible', 'Accessories', 'Digital', 'Lifestyle']

export default function FanMerchPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<{ item: MerchItem; size?: string; qty: number }[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [selected, setSelected] = useState<MerchItem | null>(null)
  const [selSize, setSelSize] = useState<string>('')
  const [selQty, setSelQty] = useState(1)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    api.get<AuthUser>('/auth/me').then((r) => {
      if (r.data.user_type !== 'fan') { router.replace('/celebrity/dashboard'); return }
      setUser(r.data)
    }).catch(() => router.replace('/login')).finally(() => setLoading(false))
  }, [router])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const addToCart = (item: MerchItem, size?: string, qty = 1) => {
    setCart(prev => {
      const existing = prev.findIndex(c => c.item.id === item.id && c.size === size)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = { ...next[existing], qty: next[existing].qty + qty }
        return next
      }
      return [...prev, { item, size, qty }]
    })
    showToast(`🛍️ Added "${item.name}" to cart`)
    setSelected(null)
  }

  const removeFromCart = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx))

  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  const filtered = MERCH.filter(m => {
    const matchCat = catFilter === 'All' || m.category === catFilter
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.celebrity.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const displayName = user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan'

  if (loading) return (
    <DashShell navItems={navItems} userName="…" roleLabel="Fan" accentColor="mint">
      <div className="flex items-center justify-center py-20"><span className="text-slate-500">Loading…</span></div>
    </DashShell>
  )

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      {/* Toast */}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-mint/30 bg-[#071e29] px-5 py-3 text-sm text-white shadow-xl">{toast}</div>}

      {/* Product detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#071e29] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${selected.gradient} text-4xl`}>
              {selected.image}
            </div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-white">{selected.name}</h3>
              {selected.tag && <span className="rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-bold text-amber">{selected.tag}</span>}
            </div>
            <p className="mb-4 text-xs text-slate-500">by {selected.celebrity} · {selected.category}</p>
            <p className="mb-5 text-2xl font-extrabold text-white">${selected.price}</p>

            {selected.sizes && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Size</p>
                <div className="flex flex-wrap gap-2">
                  {selected.sizes.map(s => (
                    <button key={s} onClick={() => setSelSize(s)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${selSize === s ? 'border-mint bg-mint/10 text-mint-soft' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6 flex items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Qty</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelQty(q => Math.max(1, q - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white hover:bg-white/10">−</button>
                <span className="w-6 text-center text-sm font-bold text-white">{selQty}</span>
                <button onClick={() => setSelQty(q => Math.min(10, q + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white hover:bg-white/10">+</button>
              </div>
              <p className="ml-auto font-bold text-white">${(selected.price * selQty).toFixed(2)}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => addToCart(selected, selSize || undefined, selQty)} className="flex-1 rounded-xl border border-mint/30 py-2.5 text-sm font-semibold text-mint-soft hover:bg-mint/10">
                Add to Cart
              </button>
              <Link
                href={`/fan/checkout?type=merch&id=${selected.id}&title=${encodeURIComponent(selected.name)}&amount=${selected.price * selQty}&currency=USD`}
                className="flex-1 btn-primary rounded-xl py-2.5 text-center text-sm font-bold"
              >
                Buy Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setCartOpen(false)}>
          <div className="w-full max-w-sm bg-[#071e29] border-l border-white/10 flex flex-col h-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <h3 className="font-display font-bold text-white">Cart ({cartCount})</h3>
              <button onClick={() => setCartOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-10">Your cart is empty</p>
              ) : cart.map((c, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <span className="text-2xl">{c.item.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{c.item.name}</p>
                    {c.size && <p className="text-[10px] text-slate-500">Size: {c.size}</p>}
                    <p className="text-[10px] text-slate-500">Qty: {c.qty} · ${(c.item.price * c.qty).toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeFromCart(i)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-white/[0.07] px-5 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Total</span>
                  <span className="font-display text-lg font-bold text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <Link
                  href={`/fan/checkout?type=cart&title=${encodeURIComponent(`${cartCount} items`)}&amount=${cartTotal.toFixed(2)}&currency=USD`}
                  className="btn-primary block w-full rounded-xl py-3 text-center text-sm font-bold"
                  onClick={() => setCartOpen(false)}
                >
                  Checkout — ${cartTotal.toFixed(2)}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Merch Store</h1>
          <p className="mt-1 text-sm text-slate-400">Official creator merchandise, collectibles &amp; digital goods</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-300 transition hover:border-mint/30 hover:text-mint-soft"
        >
          🛒 Cart
          {cartCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-mint text-[10px] font-bold text-[#030d13]">{cartCount}</span>
          )}
        </button>
      </div>

      {/* Search + Category */}
      <div className="mb-5 relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, creators…" className="w-full rounded-xl border border-white/10 bg-[#050f17] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/10" />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {CATS.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${catFilter === c ? 'bg-mint text-[#030d13]' : 'border border-white/10 bg-white/[0.04] text-slate-400 hover:border-mint/30 hover:text-mint-soft'}`}>{c}</button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="mb-3 text-4xl">🛍️</span>
          <p className="font-semibold text-white">No items found</p>
          <button onClick={() => { setSearch(''); setCatFilter('All') }} className="mt-3 text-sm text-mint-soft hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(item => (
            <div key={item.id} className="group flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden transition hover:border-mint/20 hover:bg-white/[0.05]">
              {/* Image area */}
              <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${item.gradient} text-5xl relative`}>
                {item.image}
                {item.tag && <span className="absolute top-3 right-3 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">{item.tag}</span>}
                {item.stock < 20 && !item.tag && <span className="absolute top-3 right-3 rounded-full bg-red-500/80 px-2.5 py-0.5 text-[10px] font-bold text-white">{item.stock} left</span>}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="font-semibold text-sm text-white leading-tight">{item.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{item.celebrity} · {item.category}</p>
                {item.sizes && <p className="mt-1 text-[10px] text-slate-600">Sizes: {item.sizes.join(', ')}</p>}
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-white">${item.price}</span>
                  <button
                    onClick={() => { setSelected(item); setSelSize(''); setSelQty(1) }}
                    className="rounded-lg bg-mint/10 px-3 py-1.5 text-xs font-semibold text-mint-soft transition hover:bg-mint/20"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashShell>
  )
}
