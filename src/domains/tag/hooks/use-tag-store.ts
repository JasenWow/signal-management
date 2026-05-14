import { create } from 'zustand'
import type { Tag, CreateTagInput, UpdateTagInput } from '@/foundation/types'

interface TagStore {
  tags: Tag[]
  loading: boolean

  loadTags: () => Promise<void>
  createTag: (name: string, color?: string) => Promise<Tag>
  updateTag: (id: string, data: UpdateTagInput) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  assignTagsToSignal: (signalId: string, tagIds: string[]) => Promise<void>
  removeTagFromSignal: (signalId: string, tagId: string) => Promise<void>
  assignTagsToMessage: (messageId: string, tagIds: string[]) => Promise<void>
  removeTagFromMessage: (messageId: string, tagId: string) => Promise<void>
}

export const useTagStore = create<TagStore>((set) => ({
  tags: [],
  loading: false,

  loadTags: async () => {
    set({ loading: true })
    const res = await fetch('/api/tags')
    const tags = await res.json()
    set({ tags, loading: false })
  },

  createTag: async (name, color) => {
    const body: CreateTagInput = { name, color }
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Failed to create tag')
    }
    const tag = await res.json()
    set((s) => ({ tags: [...s.tags, tag] }))
    return tag as Tag
  },

  updateTag: async (id, data) => {
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update tag')
    const updated = await res.json()
    set((s) => ({ tags: s.tags.map((t) => (t.id === id ? updated : t)) }))
  },

  deleteTag: async (id) => {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete tag')
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }))
  },

  assignTagsToSignal: async (signalId, tagIds) => {
    const res = await fetch(`/api/tags/signals/${signalId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds }),
    })
    if (!res.ok) throw new Error('Failed to assign tags')
  },

  removeTagFromSignal: async (signalId, tagId) => {
    const res = await fetch(`/api/tags/signals/${signalId}/tags/${tagId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to remove tag')
  },

  assignTagsToMessage: async (messageId, tagIds) => {
    const res = await fetch(`/api/tags/messages/${messageId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds }),
    })
    if (!res.ok) throw new Error('Failed to assign tags')
  },

  removeTagFromMessage: async (messageId, tagId) => {
    const res = await fetch(`/api/tags/messages/${messageId}/tags/${tagId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to remove tag')
  },
}))
