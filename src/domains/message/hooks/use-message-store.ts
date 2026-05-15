import { create } from 'zustand'
import type { Message, Signal, SignalGroup, CreateMessageInput, CreateSignalInput, CreateSignalGroupInput, UpdateSignalGroupInput, BitNumbering } from '@/foundation/types'

interface MessageStore {
  messages: Message[]
  activeMessage: Message | null
  activeMessageId: string | null
  activeSignals: Signal[]
  activeGroups: SignalGroup[]
  selectedSignalId: string | null
  selectedGroupId: string | null
  pendingSelection: { startBit: number; bitLength: number; groupId?: string | null } | null
  bitNumbering: BitNumbering

  loadMessages: () => Promise<void>
  selectMessage: (id: string) => Promise<void>
  createMessage: (data: CreateMessageInput) => Promise<Message>
  updateMessage: (id: string, data: Partial<CreateMessageInput>) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  importSpec: (data: { message: CreateMessageInput; signals: CreateSignalInput[]; signalGroups?: CreateSignalGroupInput[] }) => Promise<Message>

  addSignal: (data: { startBit: number; bitLength: number; groupId?: string | null }) => void
  createSignal: (data: CreateSignalInput) => Promise<void>
  updateSignal: (id: string, data: Partial<CreateSignalInput>) => Promise<void>
  deleteSignal: (id: string) => Promise<void>

  createGroup: (data: CreateSignalGroupInput) => Promise<void>
  updateGroup: (id: string, data: UpdateSignalGroupInput) => Promise<void>
  deleteGroup: (id: string) => Promise<void>

  setSelectedSignal: (id: string | null) => void
  setSelectedGroup: (id: string | null) => void
  setPendingSelection: (sel: { startBit: number; bitLength: number; groupId?: string | null } | null) => void
  setBitNumbering: (mode: BitNumbering) => void
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: [],
  activeMessage: null,
  activeMessageId: null,
  activeSignals: [],
  activeGroups: [],
  selectedSignalId: null,
  selectedGroupId: null,
  pendingSelection: null,
  bitNumbering: 'msb0',

  loadMessages: async () => {
    const res = await fetch('/api/messages')
    const messages = await res.json()
    set({ messages })
  },

  selectMessage: async (id: string) => {
    if (!id) {
      set({ activeMessageId: null, activeMessage: null, activeSignals: [], activeGroups: [], selectedSignalId: null, selectedGroupId: null, pendingSelection: null })
      return
    }
    const res = await fetch(`/api/messages/${id}`)
    const data = await res.json()
    const { signals, signalGroups, ...messageData } = data
    set({
      activeMessageId: id,
      activeMessage: messageData as Message,
      activeSignals: signals ?? [],
      activeGroups: signalGroups ?? [],
      selectedSignalId: null,
      selectedGroupId: null,
      pendingSelection: null,
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
      const { signals, signalGroups, ...messageData } = data
      set({ activeMessage: messageData as Message })
    }
  },

  deleteMessage: async (id) => {
    await fetch(`/api/messages/${id}`, { method: 'DELETE' })
    if (get().activeMessageId === id) {
      set({ activeMessageId: null, activeMessage: null, activeSignals: [], activeGroups: [] })
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

  createGroup: async (data) => {
    const { activeMessageId } = get()
    if (!activeMessageId) return
    const res = await fetch(`/api/messages/${activeMessageId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Failed to create group')
    }
    const group = await res.json()
    set((s) => ({ activeGroups: [...s.activeGroups, group] }))
  },

  updateGroup: async (id, data) => {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Failed to update group')
    }
    const updated = await res.json()
    set((s) => ({
      activeGroups: s.activeGroups.map((g) => (g.id === id ? updated : g)),
    }))
  },

  deleteGroup: async (id) => {
    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Failed to delete group')
    }
    set((s) => ({
      activeGroups: s.activeGroups.filter((g) => g.id !== id),
      activeSignals: s.activeSignals.filter((sig) => sig.groupId !== id),
      selectedGroupId: s.selectedGroupId === id ? null : s.selectedGroupId,
    }))
  },

  setSelectedSignal: (id) => set({ selectedSignalId: id }),
  setSelectedGroup: (id) => set({ selectedGroupId: id }),
  setPendingSelection: (sel) => set({ pendingSelection: sel }),
  setBitNumbering: (mode) => set({ bitNumbering: mode }),
}))
