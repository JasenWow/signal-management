import { describe, it, expect } from 'vitest'
import type { Tag, CreateTagInput, UpdateTagInput, SignalDataType } from '@shared/types'
import { DEFAULT_TAG_COLORS } from '@shared/constants'

describe('Tag Types and Validation', () => {
  it('should create a valid Tag object', () => {
    const tag: Tag = {
      id: 'test-id',
      name: 'Engine',
      color: '#EF4444',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    expect(tag.id).toBe('test-id')
    expect(tag.name).toBe('Engine')
    expect(tag.color).toBe('#EF4444')
  })

  it('should create valid CreateTagInput', () => {
    const input: CreateTagInput = { name: 'Safety' }
    expect(input.name).toBe('Safety')
    expect(input.color).toBeUndefined()

    const withColor: CreateTagInput = { name: 'Safety', color: '#22C55E' }
    expect(withColor.color).toBe('#22C55E')
  })

  it('should create valid UpdateTagInput', () => {
    const input: UpdateTagInput = { name: 'Updated' }
    expect(input.name).toBe('Updated')

    const colorOnly: UpdateTagInput = { color: '#3B82F6' }
    expect(colorOnly.color).toBe('#3B82F6')
  })

  it('should have 12 default tag colors', () => {
    expect(DEFAULT_TAG_COLORS).toHaveLength(12)
  })
})

describe('Signal Data Type', () => {
  it('should accept all valid SignalDataType values', () => {
    const types: SignalDataType[] = [
      'uint8', 'int8', 'uint16', 'int16', 'uint32', 'int32',
      'uint64', 'int64', 'float32', 'float64', 'boolean'
    ]
    expect(types).toHaveLength(11)
    for (const t of types) {
      expect(typeof t).toBe('string')
    }
  })

  it('should allow null dataType for signals', () => {
    const dataType: SignalDataType | null = null
    expect(dataType).toBeNull()
  })
})