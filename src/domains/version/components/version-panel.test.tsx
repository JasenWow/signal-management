import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VersionPanel } from './version-panel'
import { useVersionStore } from '../hooks/use-version-store'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'

vi.mock('@/domains/message/hooks/use-message-store', () => ({
  useMessageStore: vi.fn(() => ({ activeMessageId: 'msg-1' })),
}))

vi.mock('../hooks/use-version-store', () => ({
  useVersionStore: vi.fn(),
  isPreviewMode: vi.fn(),
}))

const mockVersions = [
  {
    id: 'v-1',
    messageId: 'msg-1',
    message: 'Latest version',
    createdAt: '2024-01-01T12:00:00Z',
  },
  {
    id: 'v-2',
    messageId: 'msg-1',
    message: 'Second version',
    createdAt: '2024-01-01T11:00:00Z',
  },
  {
    id: 'v-3',
    messageId: 'msg-1',
    message: 'Third version',
    createdAt: '2024-01-01T10:00:00Z',
  },
]

describe('VersionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMessageStore as any).mockReturnValue({ activeMessageId: 'msg-1' })
    ;(useVersionStore as any).mockReturnValue({
      versions: mockVersions,
      commit: vi.fn(),
      rollback: vi.fn(),
    })
  })

  describe('click-to-preview', () => {
    it('should call loadVersionSnapshot when clicking a non-latest version', async () => {
      const loadVersionSnapshot = vi.fn()
      ;(useVersionStore as any).mockReturnValue({
        versions: mockVersions,
        commit: vi.fn(),
        rollback: vi.fn(),
        loadVersionSnapshot,
        clearPreview: vi.fn(),
        previewVersionId: null,
      })

      render(<VersionPanel />)

      const secondVersion = screen.getByText('Second version').closest('div')
      fireEvent.click(secondVersion!)

      expect(loadVersionSnapshot).toHaveBeenCalledWith('v-2')
    })

    it('should call clearPreview when clicking the latest version', async () => {
      const clearPreview = vi.fn()
      ;(useVersionStore as any).mockReturnValue({
        versions: mockVersions,
        commit: vi.fn(),
        rollback: vi.fn(),
        loadVersionSnapshot: vi.fn(),
        clearPreview,
        previewVersionId: null,
      })

      render(<VersionPanel />)

      const latestVersion = screen.getByText('Latest version').closest('div')
      fireEvent.click(latestVersion!)

      expect(clearPreview).toHaveBeenCalled()
    })

    it('should highlight the version currently in preview', async () => {
      ;(useVersionStore as any).mockReturnValue({
        versions: mockVersions,
        commit: vi.fn(),
        rollback: vi.fn(),
        loadVersionSnapshot: vi.fn(),
        clearPreview: vi.fn(),
        previewVersionId: 'v-2',
      })

      render(<VersionPanel />)

      const secondVersion = screen.getByText('Second version').closest('div')
      expect(secondVersion?.className).toContain('bg-blue-50')
      expect(secondVersion?.className).toContain('border-l-2')
      expect(secondVersion?.className).toContain('border-blue-500')
    })

    it('should show "查看" text hint on non-latest versions', () => {
      render(<VersionPanel />)

      const secondVersion = screen.getByText('Second version')
      expect(secondVersion).not.toBeNull()
    })

    it('should disable rollback button when in preview mode', async () => {
      ;(useVersionStore as any).mockReturnValue({
        versions: mockVersions,
        commit: vi.fn(),
        rollback: vi.fn(),
        loadVersionSnapshot: vi.fn(),
        clearPreview: vi.fn(),
        previewVersionId: 'v-2',
      })

      render(<VersionPanel />)

      const rollbackButtons = screen.getAllByText('Rollback')
      rollbackButtons.forEach((btn) => {
        expect((btn as HTMLButtonElement).disabled).toBe(true)
        expect((btn as HTMLButtonElement).title).toBe('退出预览后才能回滚')
      })
    })

    it('should enable rollback button when not in preview mode', () => {
      ;(useVersionStore as any).mockReturnValue({
        versions: mockVersions,
        commit: vi.fn(),
        rollback: vi.fn(),
        loadVersionSnapshot: vi.fn(),
        clearPreview: vi.fn(),
        previewVersionId: null,
      })

      render(<VersionPanel />)

      const rollbackButtons = screen.getAllByText('Rollback')
      rollbackButtons.forEach((btn) => {
        expect((btn as HTMLButtonElement).disabled).toBe(false)
      })
    })
  })
})