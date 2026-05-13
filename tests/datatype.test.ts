import { describe, it, expect } from 'vitest'
import { DATA_TYPE_BIT_LENGTH_MAP, SIGNAL_DATA_TYPES, DEFAULT_TAG_COLORS, DEFAULT_SIGNAL_COLORS } from '@shared/constants'

describe('Data Type Constants', () => {
  it('should have 11 data types', () => {
    expect(SIGNAL_DATA_TYPES).toHaveLength(11)
  })

  it('should include all standard C types', () => {
    expect(SIGNAL_DATA_TYPES).toContain('uint8')
    expect(SIGNAL_DATA_TYPES).toContain('int8')
    expect(SIGNAL_DATA_TYPES).toContain('uint16')
    expect(SIGNAL_DATA_TYPES).toContain('int16')
    expect(SIGNAL_DATA_TYPES).toContain('uint32')
    expect(SIGNAL_DATA_TYPES).toContain('int32')
    expect(SIGNAL_DATA_TYPES).toContain('uint64')
    expect(SIGNAL_DATA_TYPES).toContain('int64')
    expect(SIGNAL_DATA_TYPES).toContain('float32')
    expect(SIGNAL_DATA_TYPES).toContain('float64')
    expect(SIGNAL_DATA_TYPES).toContain('boolean')
  })

  it('should map each data type to correct bit length', () => {
    expect(DATA_TYPE_BIT_LENGTH_MAP.uint8).toBe(8)
    expect(DATA_TYPE_BIT_LENGTH_MAP.int8).toBe(8)
    expect(DATA_TYPE_BIT_LENGTH_MAP.uint16).toBe(16)
    expect(DATA_TYPE_BIT_LENGTH_MAP.int16).toBe(16)
    expect(DATA_TYPE_BIT_LENGTH_MAP.uint32).toBe(32)
    expect(DATA_TYPE_BIT_LENGTH_MAP.int32).toBe(32)
    expect(DATA_TYPE_BIT_LENGTH_MAP.uint64).toBe(64)
    expect(DATA_TYPE_BIT_LENGTH_MAP.int64).toBe(64)
    expect(DATA_TYPE_BIT_LENGTH_MAP.float32).toBe(32)
    expect(DATA_TYPE_BIT_LENGTH_MAP.float64).toBe(64)
    expect(DATA_TYPE_BIT_LENGTH_MAP.boolean).toBe(1)
  })

  it('should have a bit length for every data type', () => {
    for (const dt of SIGNAL_DATA_TYPES) {
      expect(DATA_TYPE_BIT_LENGTH_MAP[dt as keyof typeof DATA_TYPE_BIT_LENGTH_MAP]).toBeDefined()
      expect(typeof DATA_TYPE_BIT_LENGTH_MAP[dt as keyof typeof DATA_TYPE_BIT_LENGTH_MAP]).toBe('number')
    }
  })

  it('should have valid hex color codes in DEFAULT_TAG_COLORS', () => {
    for (const color of DEFAULT_TAG_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})