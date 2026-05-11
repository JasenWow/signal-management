import { create } from 'zustand'
import type { Message, Signal, CreateMessageInput, CreateSignalInput, UpdateSignalInput, BitNumbering } from '@shared/types'

interface MessageStore {
  messages: Message[]
  activeMessage: Message | null
  activeMessageId: string | null
  activeSignals: Signal[]
  selectedSignalId: string | null
  pendingSelection: { startBit: number; bitLength: number } | null
  bitNumbering: BitNumbering

  loadMessages: () => Promise<void>
  selectMessage: (id: string) => Promise<void>
  createMessage: (data: CreateMessageInput) => Promise<Message>
  updateMessage: (id: string, data: Partial<CreateMessageInput>) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  importSpec: (data: { message: CreateMessageInput; signals: CreateSignalInput[] }) => Promise<Message>

  addSignal: (data: { startBit: number; bitLength: number }) => void
  createSignal: (data: CreateSignalInput) => Promise<void>
  updateSignal: (id: string, data: UpdateSignalInput) => Promise<void>
  deleteSignal: (id: string) => Promise<void>

  setSelectedSignal: (id: string | null) => void
  setPendingSelection: (sel: { startBit: number; bitLength: number } | null) => void
  setBitNumbering: (mode: BitNumbering) => void
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: [],
  activeMessage: null,
  activeMessageId: null,
  activeSignals: [],
  selectedSignalId: null,
  pendingSelection: null,
  bitNumbering: 'msb0',

  loadMessages: async () => {
    const res = await fetch('/api/messages')
    const messages = await res.json()
    set({ messages })
  },

  selectMessage: async (id: string) => {
    if (!id) {
      console.trace('[DEBUG] selectMessage called with empty id — resetting activeMessageId')
      set({ activeMessageId: null, activeMessage: null, activeSignals: [], selectedSignalId: null })
      return
    }
    const res = await fetch(`/api/messages/${id}`)
    const data = await res.json()
    const { signals, ...messageData } = data
    set({
      activeMessageId: id,
      activeMessage: messageData as Message,
      activeSignals: signals ?? [],
      selectedSignalId: null,
    })
  },

  createMessage: async (data) => {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const message = await res.json()
    await get().loadMessages()
    return message
  },

  updateMessage: async (id, data) => {
    const current = get().activeMessage
    if (current && current.id === id) {
      set({ activeMessage: { ...current, ...data, updatedAt: new Date().toISOString() } })
    }
    await fetch(`/api/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await get().loadMessages()
    if (get().activeMessageId === id) {
      const res = await fetch(`/api/messages/${id}`)
      const data = await res.json()
      const { signals, ...messageData } = data
      set({ activeMessage: messageData as Message })
    }
  },

  deleteMessage: async (id) => {
    await fetch(`/api/messages/${id}`, { method: 'DELETE' })
    if (get().activeMessageId === id) {
      set({ activeMessageId: null, activeMessage: null, activeSignals: [] })
    }
    await get().loadMessages()
  },

  importSpec: async (data) => {
    const res = await fetch('/api/messages/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Import failed')
    const result = await res.json()
    await get().loadMessages()
    await get().selectMessage(result.id)
    return result as Message
  },

  addSignal: (data) => {
    set({ pendingSelection: data })
  },

  createSignal: async (data) => {
    const { activeMessageId } = get()
    if (!activeMessageId) return
    const res = await fetch(`/api/messages/${activeMessageId}/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Failed to create signal')
    }
    const signal = await res.json()
    set((s) => ({
      activeSignals: [...s.activeSignals, signal],
      pendingSelection: null,
    }))
  },

  updateSignal: async (id, data) => {
    const res = await fetch(`/api/signals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Failed to update signal')
    }
    const updated = await res.json()
    set((s) => ({
      activeSignals: s.activeSignals.map((sig) => (sig.id === id ? updated : sig)),
    }))
  },

  deleteSignal: async (id) => {
    const res = await fetch(`/api/signals/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Failed to delete signal')
    }
    set((s) => ({
      activeSignals: s.activeSignals.filter((sig) => sig.id !== id),
      selectedSignalId: s.selectedSignalId === id ? null : s.selectedSignalId,
    }))
  },

  setSelectedSignal: (id) => set({ selectedSignalId: id }),
  setPendingSelection: (sel) => set({ pendingSelection: sel }),
  setBitNumbering: (mode) => set({ bitNumbering: mode }),
}))
