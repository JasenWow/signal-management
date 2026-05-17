import { create } from 'zustand'
import type { VersionSnapshot, VersionSummary } from '@/foundation/types'

interface VersionStore {
  versions: VersionSummary[]
  selectedVersionId: string | null
  comparisonIds: [string | null, string | null]
  activeDiff: unknown | null
  previewSnapshot: VersionSnapshot | null
  previewVersionId: string | null
  isLoadingSnapshot: boolean

  loadVersions: (messageId: string) => Promise<void>
  commit: (messageId: string, message: string) => Promise<void>
  rollback: (versionId: string) => Promise<void>
  loadDiff: (idA: string, idB: string) => Promise<void>
  setSelectedVersion: (id: string | null) => void
  setComparisonIds: (ids: [string | null, string | null]) => void
  loadVersionSnapshot: (id: string) => Promise<void>
  clearPreview: () => void
}

export const useVersionStore = create<VersionStore>((set, get) => ({
  versions: [],
  selectedVersionId: null,
  comparisonIds: [null, null],
  activeDiff: null,
  previewSnapshot: null,
  previewVersionId: null,
  isLoadingSnapshot: false,

  loadVersions: async (messageId) => {
    const res = await fetch(`/api/versions?messageId=${messageId}`)
    const versions = await res.json()
    set({ versions })
  },

  commit: async (messageId, message) => {
    await fetch('/api/versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, message }),
    })
    await get().loadVersions(messageId)
  },

  rollback: async (versionId) => {
    await fetch(`/api/versions/${versionId}/rollback`, { method: 'POST' })
    const { versions } = get()
    const version = versions.find((v) => v.id === versionId)
    if (version?.messageId) {
      await get().loadVersions(version.messageId)
    }
  },

  loadDiff: async (idA, idB) => {
    const res = await fetch(`/api/versions/${idA}/diff?compareWith=${idB}`)
    const data = await res.json()
    set({ activeDiff: data.diff })
  },

  setSelectedVersion: (id) => set({ selectedVersionId: id }),
  setComparisonIds: (ids) => set({ comparisonIds: ids }),

  loadVersionSnapshot: async (id) => {
    set({ isLoadingSnapshot: true })
    try {
      const res = await fetch(`/api/versions/${id}`)
      const data = await res.json()
      set({ previewSnapshot: data.snapshot, previewVersionId: id, isLoadingSnapshot: false })
    } catch (e) {
      set({ isLoadingSnapshot: false })
      throw e
    }
  },

  clearPreview: () => set({ previewSnapshot: null, previewVersionId: null }),
}))

export const isPreviewMode = (state: VersionStore) => state.previewSnapshot !== null
