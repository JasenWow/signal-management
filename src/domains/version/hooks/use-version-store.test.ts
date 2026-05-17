import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { useVersionStore, isPreviewMode } from './use-version-store'
import type { VersionSnapshot } from '@/foundation/types'

global.fetch = vi.fn()

describe('VersionStore - Preview State', () => {
  beforeEach(() => {
    useVersionStore.setState({
      versions: [],
      selectedVersionId: null,
      comparisonIds: [null, null],
      activeDiff: null,
      previewSnapshot: null,
      previewVersionId: null,
      isLoadingSnapshot: false,
    })
    ;(fetch as ReturnType<typeof vi.fn>).mockReset()
  })

  describe('initial state', () => {
    it('should have null previewSnapshot by default', () => {
      expect(useVersionStore.getState().previewSnapshot).toBeNull()
    })

    it('should have null previewVersionId by default', () => {
      expect(useVersionStore.getState().previewVersionId).toBeNull()
    })

    it('should have false isLoadingSnapshot by default', () => {
      expect(useVersionStore.getState().isLoadingSnapshot).toBe(false)
    })
  })

  describe('isPreviewMode', () => {
    it('should return false when previewSnapshot is null', () => {
      expect(isPreviewMode(useVersionStore.getState())).toBe(false)
    })

    it('should return true when previewSnapshot is set', () => {
      const mockSnapshot: VersionSnapshot = {
        message: { id: 'msg-1', name: 'Test', frameSize: 8, createdAt: '', updatedAt: '' },
        signals: [],
        valueTables: [],
        messageTags: [],
        signalTags: [],
      }
      useVersionStore.setState({ previewSnapshot: mockSnapshot })
      expect(isPreviewMode(useVersionStore.getState())).toBe(true)
    })
  })

  describe('loadVersionSnapshot', () => {
    it('should set isLoadingSnapshot to true while loading', async () => {
      ;(fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise((resolve) =>
          setTimeout(() => resolve({
            json: () => Promise.resolve({ snapshot: {} }),
          }), 100)
        )
      )

      const loadPromise = useVersionStore.getState().loadVersionSnapshot('version-1')

      expect(useVersionStore.getState().isLoadingSnapshot).toBe(true)

      await loadPromise
    })

    it('should set previewSnapshot and previewVersionId on success', async () => {
      const mockSnapshot: VersionSnapshot = {
        message: { id: 'msg-1', name: 'Test', frameSize: 8, createdAt: '', updatedAt: '' },
        signals: [],
        valueTables: [],
        messageTags: [],
        signalTags: [],
      }

      ;(fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({ snapshot: mockSnapshot }),
        })
      )

      await useVersionStore.getState().loadVersionSnapshot('version-123')

      expect(useVersionStore.getState().previewSnapshot).toEqual(mockSnapshot)
      expect(useVersionStore.getState().previewVersionId).toBe('version-123')
      expect(useVersionStore.getState().isLoadingSnapshot).toBe(false)
    })

    it('should set isLoadingSnapshot to false on error', async () => {
      ;(fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        Promise.reject(new Error('API Error'))
      )

      await expect(
        useVersionStore.getState().loadVersionSnapshot('version-1')
      ).rejects.toThrow()
      expect(useVersionStore.getState().isLoadingSnapshot).toBe(false)
    })
  })

  describe('clearPreview', () => {
    it('should clear previewSnapshot and previewVersionId', () => {
      const mockSnapshot: VersionSnapshot = {
        message: { id: 'msg-1', name: 'Test', frameSize: 8, createdAt: '', updatedAt: '' },
        signals: [],
        valueTables: [],
        messageTags: [],
        signalTags: [],
      }

      useVersionStore.setState({
        previewSnapshot: mockSnapshot,
        previewVersionId: 'version-123',
      })

      useVersionStore.getState().clearPreview()

      expect(useVersionStore.getState().previewSnapshot).toBeNull()
      expect(useVersionStore.getState().previewVersionId).toBeNull()
      expect(isPreviewMode(useVersionStore.getState())).toBe(false)
    })
  })
})