'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { getEcho, disconnectEcho } from '../../lib/echo'
import { AuthUser } from '../../lib/types'

type Conversation = {
  id: number
  status: 'active' | 'archived' | 'flagged'
  last_message_at: string
  order: {
    fan: {
      display_name: string | null
      user: { email: string }
    }
    service: { title: string }
  }
  latest_message: {
    content: string
    created_at: string
    sender: { email: string; user_type: string }
  } | null
}

type Message = {
  id: number
  sender_id: number
  content: string
  created_at: string
  sender: { email: string; user_type: string }
}

const navItems = [
  { href: '/celebrity/dashboard', label: 'Overview', icon: '🏠' },
  { href: '/celebrity/services',  label: 'Services',  icon: '🎬' },
  { href: '/celebrity/orders',    label: 'Orders',    icon: '📦' },
  { href: '/celebrity/earnings',  label: 'Earnings',  icon: '💰' },
  { href: '/celebrity/chat',      label: 'Fan Chat',  icon: '💬' },
  { href: '/celebrity/profile',   label: 'Profile',   icon: '⭐' },
]

export default function CelebrityChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [convs, setConvs] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Subscribe to the selected conversation via Echo
  useEffect(() => {
    if (!selected) return
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return

    const echo = getEcho(token)
    echo.private(`conversation.${selected.id}`)
      .listen('.message.sent', (event: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.id)) return prev
          return [...prev, event]
        })
      })

    return () => {
      echo.leave(`conversation.${selected.id}`)
    }
  }, [selected])

  // Cleanup Echo on unmount
  useEffect(() => () => { disconnectEcho() }, [])

  // Initial load
  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'celebrity') { router.replace('/fan/dashboard'); return }
        setUser(me.data)

        const res = await api.get<{ conversations: { data: Conversation[] } }>('/chat/conversations')
        const data = res.data.conversations.data ?? []
        setConvs(data)
        if (data.length > 0) await openConversation(data[0])
      } catch (e) {
        setError(getApiErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [router])

  const openConversation = async (conv: Conversation) => {
    setSelected(conv)
    try {
      const res = await api.get<{ messages: Message[] }>(`/chat/conversations/${conv.id}/messages`)
      setMessages(res.data.messages)
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  const onSend = async () => {
    if (!selected || !text.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await api.post<{ data: Message }>(`/chat/conversations/${selected.id}/messages`, {
        content: text.trim(),
      })
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

  const stageName = useMemo(
    () => user?.celebrity_profile?.stage_name ?? user?.celebrityProfile?.stage_name ?? user?.email ?? 'Celebrity',
    [user],
  )

  return (
    <DashShell navItems={navItems} userName={stageName} roleLabel="Celebrity" accentColor="amber">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          {/* Conversation list */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0e1218]/60 p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Subscriber chats ({convs.length})
            </p>

            {error && (
              <div className="mb-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
            )}

            <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
              {convs.map((conv) => {
                const fanName = conv.order?.fan?.display_name ?? conv.order?.fan?.user?.email ?? 'Fan'
                return (
                  <button
                    key={conv.id}
                    onClick={() => void openConversation(conv)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selected?.id === conv.id
                        ? 'border-yellow-400/40 bg-yellow-400/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <p className="truncate font-semibold text-white">{fanName}</p>
                    <p className="text-xs text-slate-400">{conv.order?.service?.title}</p>
                    {conv.latest_message && (
                      <p className="mt-1 truncate text-xs text-slate-500">{conv.latest_message.content}</p>
                    )}
                  </button>
                )
              })}
              {convs.length === 0 && (
                <p className="px-2 py-4 text-sm text-slate-400">No subscriber conversations yet.</p>
              )}
            </div>
          </div>

          {/* Chat panel */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0e1218]/60 p-4">
            {selected ? (
              <>
                <div className="mb-3">
                  <p className="font-semibold text-white">
                    {selected.order?.fan?.display_name ?? selected.order?.fan?.user?.email ?? 'Fan'}
                  </p>
                  <p className="text-xs text-slate-400">{selected.order?.service?.title}</p>
                </div>

                <div className="mb-3 h-[420px] overflow-y-auto rounded-xl border border-white/[0.06] bg-[#070a12] p-3">
                  <div className="space-y-2">
                    {messages.map((msg) => {
                      const mine = msg.sender.user_type === 'celebrity'
                      return (
                        <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[72%] rounded-xl px-3 py-2 text-sm ${
                              mine ? 'bg-yellow-400/20 text-yellow-200' : 'bg-white/10 text-slate-200'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {messages.length === 0 && (
                      <p className="text-sm text-slate-500">No messages yet.</p>
                    )}
                  </div>
                  <div ref={bottomRef} />
                </div>

                <div className="flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void onSend()}
                    placeholder="Reply to fan…"
                    className="w-full rounded-xl border border-white/10 bg-[#05131b] px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
                  />
                  <button
                    onClick={() => void onSend()}
                    disabled={sending || !text.trim()}
                    className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-[#07161e] disabled:opacity-60"
                  >
                    {sending ? '…' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center py-24 text-slate-500">
                Select a conversation to reply
              </div>
            )}
          </div>
        </div>
      )}
    </DashShell>
  )
}
