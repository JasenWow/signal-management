import { describe, it, expect } from 'vitest'
import { generateSignalId } from './signal-id'

describe('generateSignalId', () => {
  describe('determinism', () => {
    it('generates same ID for same inputs', () => {
      const id1 = generateSignalId('msg-1', 'EngineSpeed', 0, 8)
      const id2 = generateSignalId('msg-1', 'EngineSpeed', 0, 8)
      expect(id1).toBe(id2)
    })

    it('returns consistent ID across multiple calls', () => {
      const id = generateSignalId('msg-1', 'TestSignal', 0, 8)
      for (let i = 0; i < 5; i++) {
        expect(generateSignalId('msg-1', 'TestSignal', 0, 8)).toBe(id)
      }
    })
  })

  describe('uniqueness', () => {
    it('different messageId produces different ID', () => {
      const id1 = generateSignalId('msg-1', 'Signal', 0, 8)
      const id2 = generateSignalId('msg-2', 'Signal', 0, 8)
      expect(id1).not.toBe(id2)
    })

    it('different name produces different ID', () => {
      const id1 = generateSignalId('msg-1', 'SignalA', 0, 8)
      const id2 = generateSignalId('msg-1', 'SignalB', 0, 8)
      expect(id1).not.toBe(id2)
    })

    it('different startBit produces different ID', () => {
      const id1 = generateSignalId('msg-1', 'Signal', 0, 8)
      const id2 = generateSignalId('msg-1', 'Signal', 8, 8)
      expect(id1).not.toBe(id2)
    })

    it('different bitLength produces different ID', () => {
      const id1 = generateSignalId('msg-1', 'Signal', 0, 8)
      const id2 = generateSignalId('msg-1', 'Signal', 0, 16)
      expect(id1).not.toBe(id2)
    })
  })

  describe('output format', () => {
    it('returns 16 character hex string', () => {
      const id = generateSignalId('msg-1', 'TestSignal', 0, 8)
      expect(id).toMatch(/^[0-9a-f]{16}$/)
    })

    it('returns lowercase hex characters', () => {
      const id = generateSignalId('msg-1', 'TestSignal', 0, 8)
      expect(id).toBe(id.toLowerCase())
    })
  })

  describe('input validation', () => {
    it('throws on empty messageId', () => {
      expect(() => generateSignalId('', 'Signal', 0, 8)).toThrow('messageId must be a non-empty string')
    })

    it('throws on whitespace-only messageId', () => {
      expect(() => generateSignalId('   ', 'Signal', 0, 8)).toThrow('messageId must be a non-empty string')
    })

    it('throws on empty name', () => {
      expect(() => generateSignalId('msg-1', '', 0, 8)).toThrow('name must be a non-empty string')
    })

    it('throws on whitespace-only name', () => {
      expect(() => generateSignalId('msg-1', '   ', 0, 8)).toThrow('name must be a non-empty string')
    })

    it('throws on negative startBit', () => {
      expect(() => generateSignalId('msg-1', 'Signal', -1, 8)).toThrow('startBit must be a non-negative integer')
    })

    it('throws on non-integer startBit', () => {
      expect(() => generateSignalId('msg-1', 'Signal', 1.5, 8)).toThrow('startBit must be a non-negative integer')
    })

    it('throws on zero bitLength', () => {
      expect(() => generateSignalId('msg-1', 'Signal', 0, 0)).toThrow('bitLength must be a positive integer')
    })

    it('throws on negative bitLength', () => {
      expect(() => generateSignalId('msg-1', 'Signal', 0, -8)).toThrow('bitLength must be a positive integer')
    })

    it('throws on non-integer bitLength', () => {
      expect(() => generateSignalId('msg-1', 'Signal', 0, 8.5)).toThrow('bitLength must be a positive integer')
    })
  })

  describe('Unicode support', () => {
    it('handles Unicode signal name', () => {
      const id = generateSignalId('msg-1', '信号', 0, 8)
      expect(id).toMatch(/^[0-9a-f]{16}$/)
    })

    it('handles Unicode messageId', () => {
      const id = generateSignalId('消息-1', 'Signal', 0, 8)
      expect(id).toMatch(/^[0-9a-f]{16}$/)
    })
  })

  describe('typical CAN signal', () => {
    it('works with typical CAN signal parameters', () => {
      const id = generateSignalId(
        '550e8400-e29b-41d4-a716-446655440000',
        'EngineSpeed',
        0,
        16
      )
      expect(id).toMatch(/^[0-9a-f]{16}$/)
      expect(id).toHaveLength(16)
    })
  })
})
