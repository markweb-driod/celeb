'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashShell from '../../components/DashShell'
import { AUTH_TOKEN_KEY, api, getApiErrorMessage } from '../../lib/api'
import { getEcho, disconnectEcho } from '../../lib/echo'
import { AuthUser } from '../../lib/types'
import { ADMIN_NAV } from '../nav'

type ConvUser = {
  email: string
}
type FanProfile = {
  display_name: string | null
  user: ConvUser
}
type CelebProfile = {
  stage_name: string
  user: ConvUser
}
type Order = {
  fan: FanProfile
  celebrity: CelebProfile
  service: { title: string }
}
type LatestMessage = {
  content: string
  created_at: string
  sender: { email: string; user_type: string }
}
type Conversation = {
  id: number
  status: 'active' | 'archived' | 'flagged'
  last_message_at: string
  order: Order
  latest_message: LatestMessage | null
}
type Message = {
  id: number
  sender_id: number
  content: string
  created_at: string
  sender: { email: string; user_type: string }
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400 border-green-500/40 bg-green-500/10',
  archived: 'text-slate-400 border-slate-500/40 bg-slate-500/10',
  flagged: 'text-red-400 border-red-500/40 bg-red-500/10',
}

export default function AdminChatsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [convs, setConvs] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Admin presence channel for live supervision — gets notified of all new messages
  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return

    const echo = getEcho(token)
    echo.join('admin.chat-supervision')
      .listen('.message.sent', (event: Message & { conversation_id: number }) => {
        // Refresh message list if the supervised conversation is currently open
        if (selected && event.conversation_id === selected.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.id)) return prev
            return [...prev, event]
          })
        }
        // Bump conversation to top in list
        setConvs((prev) => {
          const idx = prev.findIndex((c) => c.id === event.conversation_id)
          if (idx === -1) return prev
          const updated = { ...prev[idx], last_message_at: event.created_at, latest_message: { ...event, sender: event.sender ?? { email: '', user_type: '' } } }
          const rest = prev.filter((c) => c.id !== event.conversation_id)
          return [updated, ...rest]
        })
      })

    return () => {
      echo.leave('admin.chat-supervision')
      disconnectEcho()
    }
  }, [selected])

  useEffect(() => {
    const load = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) { router.replace('/login'); return }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (me.data.user_type !== 'admin') { router.replace('/dashboard'); return }
        setUser(me.data)
        const res = await api.get<{ conversations: { data: Conversation[] } }>('/admin/chats')
        setConvs(res.data.conversations.data)
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
      const res = await api.get<{ messages: { data: Message[] } }>(`/admin/chats/${conv.id}/messages`)
      setMessages(res.data.messages.data)
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  const updateStatus = async (conv: Conversation, status: string) => {
    setActionLoading(conv.id)
    try {
      await api.patch(`/admin/chats/${conv.id}/status`, { status })
      setConvs((prev) => prev.map((c) => c.id === conv.id ? { ...c, status: status as Conversation['status'] } : c))
      if (selected?.id === conv.id) setSelected((s) => s ? { ...s, status: status as Conversation['status'] } : s)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setActionLoading(null)
    }
  }

  const deleteMessage = async (msgId: number) => {
    if (!selected) return
    try {
      await api.delete(`/admin/chats/${selected.id}/messages/${msgId}`)
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  if (loading) return (
    <DashShell navItems={ADMIN_NAV} userName="Admin" roleLabel="Admin" accentColor="amber">
      <div className="flex h-40 items-center justify-center text-slate-400">Loading...</div>
    </DashShell>
  )

  return (
    <DashShell navItems={ADMIN_NAV} userName={user?.email ?? 'Admin'} roleLabel="Admin" accentColor="amber">
      {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Conversation list */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f1a]/60 p-3">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">All conversations ({convs.length})</p>
          <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
            {convs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => void openConversation(conv)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selected?.id === conv.id ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{conv.order?.celebrity?.stage_name ?? '—'}</p>
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[conv.status] ?? ''}`}>
                    {conv.status}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-400">Fan: {conv.order?.fan?.user?.email ?? '—'}</p>
                {conv.latest_message && (
                  <p className="mt-1 truncate text-xs text-slate-500">{conv.latest_message.content}</p>
                )}
              </button>
            ))}
            {convs.length === 0 && <p className="px-2 py-4 text-sm text-slate-400">No conversations yet.</p>}
          </div>
        </div>

        {/* Messages panel */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f1a]/60 p-4">
          {selected ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {selected.order?.celebrity?.stage_name} ↔ {selected.order?.fan?.user?.email}
                  </p>
                  <p className="text-xs text-slate-400">{selected.order?.service?.title}</p>
                </div>
                <div className="flex gap-2">
                  {(['active', 'flagged', 'archived'] as const).map((s) => (
                    <button
                      key={s}
                      disabled={actionLoading === selected.id || selected.status === s}
                      onClick={() => void updateStatus(selected, s)}
                      className={`rounded-lg border px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
                        selected.status === s ? STATUS_COLORS[s] : 'border-white/10 text-slate-400 hover:border-white/30'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3 h-[420px] overflow-y-auto rounded-xl border border-white/[0.06] bg-[#07091a] p-3">
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="group flex items-start justify-between gap-2">
                      <div className={`max-w-[76%] rounded-xl px-3 py-2 text-sm ${
                        msg.sender.user_type === 'celebrity' ? 'bg-purple-500/20 text-purple-200' : 'bg-white/10 text-slate-200'
                      }`}>
                        <p className="mb-0.5 text-[10px] font-semibold text-slate-500">
                          {msg.sender.email} ({msg.sender.user_type})
                        </p>
                        <p>{msg.content}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{new Date(msg.created_at).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => void deleteMessage(msg.id)}
                        className="invisible shrink-0 rounded-lg border border-red-500/30 px-2 py-1 text-[10px] text-red-400 opacity-0 transition hover:bg-red-500/10 group-hover:visible group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {messages.length === 0 && <p className="text-sm text-slate-500">No messages in this conversation.</p>}
                </div>
                <div ref={bottomRef} />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center py-24 text-slate-500">
              Select a conversation to supervise
            </div>
          )}
        </div>
      </div>
    </DashShell>
  )
}
