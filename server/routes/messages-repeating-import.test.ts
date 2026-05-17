import { describe, it, expect } from 'bun:test'

/**
 * Validates repeatCount in import data flow.
 * Mirrors the signal-groups.test.ts pattern for pure function unit tests.
 */

interface SignalGroupInput {
  name: string
  startBit: number
  bitWidth: number
  repeatCount?: number | null
  isRepeating?: boolean
}

/**
 * Simulates the repeatCount handling from messages.ts lines 124-125:
 *   repeatCount: g.repeatCount ?? null
 */
function extractRepeatCount(group: SignalGroupInput): number | null {
  return group.repeatCount ?? null
}

/**
 * Simulates isRepeating default from messages.ts line 124:
 *   isRepeating: g.isRepeating ?? false
 */
function extractIsRepeating(group: SignalGroupInput): boolean {
  return group.isRepeating ?? false
}

describe('repeatCount in import data flow', () => {
  it('preserves repeatCount=4 as provided', () => {
    const group: SignalGroupInput = {
      name: 'data_field',
      startBit: 0,
      bitWidth: 8,
      repeatCount: 4,
    }

    const result = extractRepeatCount(group)
    expect(result).toBe(4)
  })

  it('defaults repeatCount=null when not provided', () => {
    const group: SignalGroupInput = {
      name: 'status_field',
      startBit: 8,
      bitWidth: 4,
    }

    const result = extractRepeatCount(group)
    expect(result).toBeNull()
  })

  it('handles empty signalGroups array', () => {
    const groups: SignalGroupInput[] = []

    const repeatCounts = groups.map(extractRepeatCount)
    expect(repeatCounts).toEqual([])
  })

  it('preserves repeatCount=0 as valid value', () => {
    const group: SignalGroupInput = {
      name: 'reserved_field',
      startBit: 16,
      bitWidth: 2,
      repeatCount: 0,
    }

    const result = extractRepeatCount(group)
    expect(result).toBe(0)
  })

  it('defaults isRepeating=false when not provided', () => {
    const group: SignalGroupInput = {
      name: 'data_field',
      startBit: 0,
      bitWidth: 8,
    }

    const result = extractIsRepeating(group)
    expect(result).toBe(false)
  })
})