import { create } from 'zustand'
import type { Message, Signal, CreateMessageInput, CreateSignalInput, UpdateSignalInput } from '@shared/types'

interface MessageStore {
  messages: Message[]
  activeMessageId: string | null
  activeSignals: Signal[]
  selectedSignalId: string | null
  pendingSelection: { startBit: number; bitLength: number } | null

  loadMessages: () => Promise<void>
  selectMessage: (id: string) => Promise<void>
  createMessage: (data: CreateMessageInput) => Promise<Message>
  updateMessage: (id: string, data: Partial<CreateMessageInput>) => Promise<void>
  deleteMessage: (id: string) => Promise<void>

  addSignal: (data: { startBit: number; bitLength: number }) => void
  createSignal: (data: CreateSignalInput) => Promise<void>
  updateSignal: (id: string, data: UpdateSignalInput) => Promise<void>
  deleteSignal: (id: string) => Promise<void>

  setSelectedSignal: (id: string | null) => void
  setPendingSelection: (sel: { startBit: number; bitLength: number } | null) => void
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: [],
  activeMessageId: null,
  activeSignals: [],
  selectedSignalId: null,
  pendingSelection: null,

  loadMessages: async () => {
    const res = await fetch('/api/messages')
    const messages = await res.json()
    set({ messages })
  },

  selectMessage: async (id: string) => {
    if (!id) {
      set({ activeMessageId: null, activeSignals: [], selectedSignalId: null })
      return
    }
    const res = await fetch(`/api/messages/${id}`)
    const data = await res.json()
    set({
      activeMessageId: id,
      activeSignals: data.signals ?? [],
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
    await fetch(`/api/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await get().loadMessages()
    if (get().activeMessageId === id) {
      await get().selectMessage(id)
    }
  },

  deleteMessage: async (id) => {
    await fetch(`/api/messages/${id}`, { method: 'DELETE' })
    if (get().activeMessageId === id) {
      set({ activeMessageId: null, activeSignals: [] })
    }
    await get().loadMessages()
  },

  addSignal: (data) => {
    set({ pendingSelection: data })
  },

  createSignal: async (data) => {
    const { activeMessageId } = get()
    if (!activeMessageId) return
    await fetch(`/api/messages/${activeMessageId}/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await get().selectMessage(activeMessageId)
    set({ pendingSelection: null })
  },

  updateSignal: async (id, data) => {
    await fetch(`/api/signals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const { activeMessageId } = get()
    if (activeMessageId) {
      await get().selectMessage(activeMessageId)
    }
  },

  deleteSignal: async (id) => {
    await fetch(`/api/signals/${id}`, { method: 'DELETE' })
    const { activeMessageId } = get()
    if (activeMessageId) {
      await get().selectMessage(activeMessageId)
    }
    set({ selectedSignalId: null })
  },

  setSelectedSignal: (id) => set({ selectedSignalId: id }),
  setPendingSelection: (sel) => set({ pendingSelection: sel }),
}))
