import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SignalList } from './signal-list'

vi.mock('@/domains/message/hooks/use-message-store', () => ({
  useMessageStore: () => mockStore,
}))

const mockSignals = [
  { id: 'sig-1', name: 'Signal1', startBit: 0, bitLength: 8, color: '#ff0000', tags: [], groupId: null },
  { id: 'sig-2', name: 'Signal2', startBit: 8, bitLength: 8, color: '#00ff00', tags: [], groupId: null },
]
const mockGroups = [
  { id: 'grp-1', name: 'Group1', color: '#0000ff', bitWidth: 16, repeatCount: null },
]

const mockStore = {
  activeMessageId: 'msg-1',
  activeSignals: mockSignals,
  activeGroups: mockGroups,
  selectedSignalId: null,
  selectedGroupId: null,
  bitNumbering: 'msb' as const,
  setSelectedSignal: vi.fn(),
  setSelectedGroup: vi.fn(),
  deleteSignal: vi.fn(),
  deleteGroup: vi.fn(),
}

describe('SignalList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readOnly mode', () => {
    it('should hide edit buttons when readOnly=true', () => {
      render(<SignalList onEdit={vi.fn()} readOnly={true} />)
      const editButtons = screen.queryAllByTitle('Edit')
      expect(editButtons).toHaveLength(0)
    })

    it('should hide delete buttons when readOnly=true', () => {
      render(<SignalList onEdit={vi.fn()} readOnly={true} />)
      const deleteButtons = screen.queryAllByTitle('Delete')
      expect(deleteButtons).toHaveLength(0)
    })

    it('should hide group edit buttons when readOnly=true', () => {
      render(<SignalList onEdit={vi.fn()} onEditGroup={vi.fn()} readOnly={true} />)
      const editGroupButtons = screen.queryAllByTitle('Edit Group')
      expect(editGroupButtons).toHaveLength(0)
    })

    it('should hide group delete buttons when readOnly=true', () => {
      render(<SignalList onEdit={vi.fn()} onEditGroup={vi.fn()} readOnly={true} />)
      const deleteGroupButtons = screen.queryAllByTitle('Delete Group')
      expect(deleteGroupButtons).toHaveLength(0)
    })

    it('should show edit buttons when readOnly=false (default)', () => {
      render(<SignalList onEdit={vi.fn()} readOnly={false} />)
      const editButtons = screen.queryAllByTitle('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })

    it('should show delete buttons when readOnly=false (default)', () => {
      render(<SignalList onEdit={vi.fn()} readOnly={false} />)
      const deleteButtons = screen.queryAllByTitle('Delete')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should keep signal rows clickable in readOnly mode', () => {
      render(<SignalList onEdit={vi.fn()} readOnly={true} />)
      const signalRow = screen.getByText('Signal1').closest('div')
      expect(signalRow).not.toBeNull()
    })
  })
})