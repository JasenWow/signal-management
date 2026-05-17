import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { BitCanvas } from './bit-canvas'

vi.mock('@/domains/message/hooks/use-message-store', () => ({
  useMessageStore: () => mockStore,
}))

const mockMessage = {
  id: 'msg-1',
  name: 'TestMessage',
  frameSize: 2,
  byteLength: 16,
  createdAt: '',
  updatedAt: '',
}

const mockStore = {
  activeMessage: mockMessage,
  activeMessageId: 'msg-1',
  activeSignals: [],
  activeGroups: [],
  selectedSignalId: null,
  selectedGroupId: null,
  bitNumbering: 'msb0' as const,
  setBitNumbering: vi.fn(),
}

describe('BitCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readOnly mode', () => {
    it('should have cursor-default when readOnly=true', () => {
      render(<BitCanvas onBitSelection={vi.fn()} readOnly={true} />)
      const svg = document.querySelector('svg') as SVGSVGElement
      expect(svg.className.baseVal).toContain('cursor-default')
    })

    it('should have cursor-crosshair when readOnly=false', () => {
      render(<BitCanvas onBitSelection={vi.fn()} readOnly={false} />)
      const svg = document.querySelector('svg') as SVGSVGElement
      expect(svg.className.baseVal).toContain('cursor-crosshair')
    })

    it('should hide status bar text when readOnly=true', () => {
      render(<BitCanvas onBitSelection={vi.fn()} readOnly={true} />)
      const statusBar = document.querySelector('.text-xs.text-gray-400.mt-2.h-5')
      expect(statusBar?.textContent).toBe('')
    })

    it('should not call onBitSelection when clicking in readOnly mode', () => {
      const onBitSelection = vi.fn()
      render(<BitCanvas onBitSelection={onBitSelection} readOnly={true} />)
      const svg = document.querySelector('svg') as SVGSVGElement
      svg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }))
      expect(onBitSelection).not.toHaveBeenCalled()
    })
  })
})
