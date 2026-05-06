'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { getEcho, disconnectEcho } from '../../lib/echo'
import { AuthUser } from '../../lib/types'

type Subscription = {
  order_id: number
  conversation_id: number | null
  celebrity_name: string
  service_title: string
  subscription_price: number
  currency: string
}

type SubscriptionResponse = {
  subscriptions: Subscription[]
}

type Message = {
  id: number
  sender_id: number
  content: string
  created_at: string
}

type MessageResponse = {
  messages: Message[]
}

const navItems = [
  { href: '/fan/dashboard', label: 'Overview', icon: '🏠' },
  { href: '/fan/explore', label: 'Explore', icon: '🔍' },
  { href: '/fan/orders', label: 'My Bookings', icon: '📦' },
  { href: '/fan/subscriptions', label: 'Subscriptions', icon: '⭐' },
  { href: '/fan/chat', label: 'Chat', icon: '💬' },
  { href: '/fan/tickets', label: 'Tickets', icon: '🎟️' },
  { href: '/fan/merch', label: 'Merch Store', icon: '🛍️' },
  { href: '/fan/private-booking', label: 'Private Booking', icon: '📹' },
  { href: '/fan/vault', label: 'My Vault', icon: '🔒' },
  { href: '/fan/profile', label: 'Profile', icon: '👤' },
]

export default function FanChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [selected, setSelected] = useState<Subscription | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeConvId = useRef<number | null>(null)

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Echo real-time subscription — re-subscribe whenever conversation changes
  useEffect(() => {
    const convId = subs.find((s) => s.order_id === selected?.order_id)?.conversation_id
    if (!convId) return

    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return

    activeConvId.current = convId
    const echo = getEcho(token)

    const channel = echo.private(`conversation.${convId}`)
    channel.listen('.message.sent', (event: Message & { sender_type?: string }) => {
      // Avoid duplicates: messages sent by self are added optimistically in onSend
      setMessages((prev) => {
        if (prev.some((m) => m.id === event.id)) return prev
        return [...prev, event]
      })
    })

    return () => {
      echo.leave(`conversation.${convId}`)
    }
  }, [selected, subs])

  // Disconnect Echo on unmount
  useEffect(() => {
    return () => {
      disconnectEcho()
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) {
        router.replace('/login')
        return
      }

      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'fan') {
          router.replace('/dashboard')
          return
        }

        setUser(me.data)

        const subRes = await api.get<SubscriptionResponse>('/chat/subscriptions')
        setSubs(subRes.data.subscriptions)

        if (subRes.data.subscriptions.length > 0) {
          const first = subRes.data.subscriptions[0]
          setSelected(first)
          await openConversation(first)
        }
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const openConversation = async (subscription: Subscription) => {
    setSelected(subscription)
    try {
      let conversationId = subscription.conversation_id

      if (!conversationId) {
        const created = await api.post<{ conversation: { id: number } }>('/chat/conversations', {
          order_id: subscription.order_id,
        })
        conversationId = created.data.conversation.id
      }

      const msgRes = await api.get<MessageResponse>(`/chat/conversations/${conversationId}/messages`)
      setMessages(msgRes.data.messages)

      setSubs((prev) =>
        prev.map((item) => (item.order_id === subscription.order_id ? { ...item, conversation_id: conversationId ?? null } : item)),
      )
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  const onSend = async () => {
    if (!selected || !text.trim()) return

    const selectedSub = subs.find((item) => item.order_id === selected.order_id)
    if (!selectedSub?.conversation_id) return

    setSending(true)
    setError('')

    try {
      const res = await api.post<{ data: Message }>(`/chat/conversations/${selectedSub.conversation_id}/messages`, {
        content: text.trim(),
      })
      // Optimistically add own message (Echo broadcasts to others only via toOthers())
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.data.id)) return prev
        return [...prev, res.data.data]
      })
      setText('')
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const displayName = useMemo(
    () => user?.fan_profile?.display_name ?? user?.fanProfile?.display_name ?? user?.email ?? 'Fan',
    [user],
  )

  return (
    <DashShell navItems={navItems} userName={displayName} roleLabel="Fan" accentColor="mint">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Subscribed creators</p>
            <div className="space-y-2">
              {subs.map((item) => (
                <button
                  key={item.order_id}
                  onClick={() => void openConversation(item)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selected?.order_id === item.order_id
                      ? 'border-mint/40 bg-mint/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <p className="font-semibold text-white">{item.celebrity_name}</p>
                  <p className="text-xs text-slate-400">{item.service_title}</p>
                  <p className="mt-1 text-xs text-mint-soft">{item.currency} {item.subscription_price.toFixed(2)} / month</p>
                </button>
              ))}

              {subs.length === 0 && <p className="px-2 py-4 text-sm text-slate-400">No active subscription chats yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#071e29]/60 p-4">
            <p className="mb-3 text-sm font-semibold text-white">{selected ? `Chat with ${selected.celebrity_name}` : 'Select a creator to chat'}</p>

            <div className="mb-3 h-[420px] overflow-y-auto rounded-xl border border-white/[0.06] bg-[#041018] p-3">
              <div className="space-y-2">
                {messages.map((message) => {
                  const mine = message.sender_id === user?.id
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[72%] rounded-xl px-3 py-2 text-sm ${mine ? 'bg-mint/20 text-mint-soft' : 'bg-white/10 text-slate-200'}`}>
                        <p>{message.content}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{new Date(message.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )
                })}

                {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>}
              </div>
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2">
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Type your message"
                className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-mint/40"
              />
              <button
                onClick={() => void onSend()}
                disabled={sending || !selected}
                className="rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-[#061319] disabled:opacity-60"
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashShell>
  )
}
