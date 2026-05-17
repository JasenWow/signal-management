import { describe, it, expect } from 'bun:test'

/**
 * Computes the effective end bit for a signal group considering repeatCount.
 * The end bit is startBit + bitWidth * repeatCount (or 1 if repeatCount is null/undefined).
 */
export function computeEffectiveEndBit(
  startBit: number,
  bitWidth: number,
  repeatCount: number | null | undefined,
): number {
  return startBit + bitWidth * (repeatCount ?? 1)
}

/**
 * Checks if two ranges overlap.
 * Two ranges overlap if one starts before the other ends AND the other starts before this one ends.
 */
export function checkRangeOverlap(
  rangeA: { start: number; end: number },
  rangeB: { start: number; end: number },
): boolean {
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end
}

/**
 * Derives the isRepeating flag from repeatCount.
 * isRepeating is true when repeatCount > 1.
 */
export function deriveIsRepeating(repeatCount: number | null | undefined): boolean {
  return (repeatCount ?? 1) > 1
}

/**
 * Checks if a new signal group overlaps with an existing group.
 * Handles repeatCount for both groups.
 */
export function checkGroupOverlap(
  newGroup: { startBit: number; bitWidth: number; repeatCount: number | null | undefined },
  existingGroup: { startBit: number; bitWidth: number; repeatCount: number | null | undefined },
): boolean {
  const newRange = {
    start: newGroup.startBit,
    end: computeEffectiveEndBit(newGroup.startBit, newGroup.bitWidth, newGroup.repeatCount),
  }
  const existingRange = {
    start: existingGroup.startBit,
    end: computeEffectiveEndBit(existingGroup.startBit, existingGroup.bitWidth, existingGroup.repeatCount),
  }
  return checkRangeOverlap(newRange, existingRange)
}

describe('computeEffectiveEndBit', () => {
  it('should calculate end bit with repeatCount = 1', () => {
    expect(computeEffectiveEndBit(0, 8, 1)).toBe(8)
  })

  it('should calculate end bit with repeatCount = 4', () => {
    expect(computeEffectiveEndBit(0, 8, 4)).toBe(32)
  })

  it('should handle null repeatCount as 1', () => {
    expect(computeEffectiveEndBit(0, 8, null)).toBe(8)
  })

  it('should handle undefined repeatCount as 1', () => {
    expect(computeEffectiveEndBit(0, 8, undefined)).toBe(8)
  })

  it('should calculate end bit with non-zero startBit', () => {
    expect(computeEffectiveEndBit(8, 16, 2)).toBe(40)
  })

  it('should handle repeatCount = 0 (edge case per task requirement)', () => {
    // repeatCount = 0 means the group spans no bits
    expect(computeEffectiveEndBit(0, 8, 0)).toBe(0)
  })
})

describe('checkRangeOverlap', () => {
  it('should detect no overlap when ranges are apart', () => {
    const rangeA = { start: 0, end: 8 }
    const rangeB = { start: 16, end: 24 }
    expect(checkRangeOverlap(rangeA, rangeB)).toBe(false)
  })

  it('should detect overlap when ranges intersect', () => {
    const rangeA = { start: 0, end: 16 }
    const rangeB = { start: 8, end: 24 }
    expect(checkRangeOverlap(rangeA, rangeB)).toBe(true)
  })

  it('should detect no overlap when ranges touch at boundary', () => {
    const rangeA = { start: 0, end: 8 }
    const rangeB = { start: 8, end: 16 }
    expect(checkRangeOverlap(rangeA, rangeB)).toBe(false)
  })

  it('should detect no overlap when one is entirely before another', () => {
    const rangeA = { start: 0, end: 8 }
    const rangeB = { start: 10, end: 18 }
    expect(checkRangeOverlap(rangeA, rangeB)).toBe(false)
  })

  it('should detect overlap when one range is inside another', () => {
    const rangeA = { start: 0, end: 32 }
    const rangeB = { start: 8, end: 16 }
    expect(checkRangeOverlap(rangeA, rangeB)).toBe(true)
  })
})

describe('deriveIsRepeating', () => {
  it('should return false when repeatCount is 1', () => {
    expect(deriveIsRepeating(1)).toBe(false)
  })

  it('should return true when repeatCount is 2', () => {
    expect(deriveIsRepeating(2)).toBe(true)
  })

  it('should return true when repeatCount is greater than 1', () => {
    expect(deriveIsRepeating(4)).toBe(true)
  })

  it('should return false when repeatCount is null', () => {
    expect(deriveIsRepeating(null)).toBe(false)
  })

  it('should return false when repeatCount is undefined', () => {
    expect(deriveIsRepeating(undefined)).toBe(false)
  })

  it('should return false when repeatCount is 0', () => {
    expect(deriveIsRepeating(0)).toBe(false)
  })
})

describe('checkGroupOverlap', () => {
  it('should detect no overlap between two single-cycle groups', () => {
    const groupA = { startBit: 0, bitWidth: 8, repeatCount: 1 }
    const groupB = { startBit: 16, bitWidth: 8, repeatCount: 1 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(false)
  })

  it('should detect overlap between two groups in same cycle', () => {
    const groupA = { startBit: 0, bitWidth: 16, repeatCount: 1 }
    const groupB = { startBit: 8, bitWidth: 16, repeatCount: 1 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(true)
  })

  it('should detect overlap with repeatCount extending into next cycle', () => {
    // Group A: bits 0-16 (repeatCount=2, bitWidth=8)
    // Group B: bits 8-16 (single cycle)
    // These overlap in the second cycle of A
    const groupA = { startBit: 0, bitWidth: 8, repeatCount: 2 }
    const groupB = { startBit: 8, bitWidth: 8, repeatCount: 1 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(true)
  })

  it('should detect overlap with both groups having repeatCount', () => {
    // Group A: bits 0-16 (repeatCount=2, bitWidth=8) -> covers 0-8 and 8-16
    // Group B: bits 8-24 (repeatCount=2, bitWidth=8) -> covers 8-16 and 16-24
    // They overlap in cycle 2 of A and cycle 1 of B
    const groupA = { startBit: 0, bitWidth: 8, repeatCount: 2 }
    const groupB = { startBit: 8, bitWidth: 8, repeatCount: 2 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(true)
  })

  it('should detect no overlap when groups are in non-overlapping cycles', () => {
    // Group A: bits 0-16 (repeatCount=2, bitWidth=8) -> covers 0-8 and 8-16
    // Group B: bits 24-32 (repeatCount=1, bitWidth=8) -> no overlap
    const groupA = { startBit: 0, bitWidth: 8, repeatCount: 2 }
    const groupB = { startBit: 24, bitWidth: 8, repeatCount: 1 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(false)
  })

  it('should handle null repeatCount as 1', () => {
    const groupA = { startBit: 0, bitWidth: 8, repeatCount: null }
    const groupB = { startBit: 8, bitWidth: 8, repeatCount: 1 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(false)
  })

  it('should handle undefined repeatCount as 1', () => {
    const groupA = { startBit: 0, bitWidth: 8, repeatCount: undefined }
    const groupB = { startBit: 8, bitWidth: 8, repeatCount: 1 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(false)
  })

  it('should detect no overlap with exact boundary fit', () => {
    const groupA = { startBit: 0, bitWidth: 8, repeatCount: 1 }
    const groupB = { startBit: 8, bitWidth: 8, repeatCount: 1 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(false)
  })

  it('should detect no overlap when cycles do not intersect', () => {
    // Group A: bits 0-8 (repeatCount=2, bitWidth=4) -> covers 0-4 and 4-8
    // Group B: bits 12-20 (repeatCount=1, bitWidth=8) -> no overlap
    const groupA = { startBit: 0, bitWidth: 4, repeatCount: 2 }
    const groupB = { startBit: 12, bitWidth: 8, repeatCount: 1 }
    expect(checkGroupOverlap(groupA, groupB)).toBe(false)
  })
})

describe('repeatCount boundary validation', () => {
  it('should compute exact frame boundary fit', () => {
    // Frame size = 64 bits (8 bytes), group at bit 0 with width 8 and repeatCount=8
    // Should exactly fit: 0 + 8*8 = 64, which equals frameSize*8
    const frameSizeBits = 64
    const startBit = 0
    const bitWidth = 8
    const repeatCount = 8
    const effectiveEndBit = computeEffectiveEndBit(startBit, bitWidth, repeatCount)
    expect(effectiveEndBit).toBe(frameSizeBits)
    expect(effectiveEndBit <= frameSizeBits).toBe(true)
  })

  it('should detect frame boundary overflow', () => {
    // Frame size = 64 bits, group at bit 0 with width 8 and repeatCount=9
    // Would exceed: 0 + 8*9 = 72 > 64
    const frameSizeBits = 64
    const startBit = 0
    const bitWidth = 8
    const repeatCount = 9
    const effectiveEndBit = computeEffectiveEndBit(startBit, bitWidth, repeatCount)
    expect(effectiveEndBit).toBeGreaterThan(frameSizeBits)
  })

  it('should compute overflow with offset startBit', () => {
    // Frame size = 64 bits, group at bit 8 with width 8 and repeatCount=8
    // Would exceed: 8 + 8*8 = 72 > 64
    const frameSizeBits = 64
    const startBit = 8
    const bitWidth = 8
    const repeatCount = 8
    const effectiveEndBit = computeEffectiveEndBit(startBit, bitWidth, repeatCount)
    expect(effectiveEndBit).toBeGreaterThan(frameSizeBits)
  })

  it('should accept exact boundary fit at offset', () => {
    // Frame size = 64 bits, group at bit 0 with width 8 and repeatCount=8 -> 64 (exact)
    // Group at bit 56 with width 8 and repeatCount=1 -> 64 (exact)
    const frameSizeBits = 64
    const startBit = 56
    const bitWidth = 8
    const repeatCount = 1
    const effectiveEndBit = computeEffectiveEndBit(startBit, bitWidth, repeatCount)
    expect(effectiveEndBit).toBe(frameSizeBits)
  })
})

describe('isRepeating normalization', () => {
  it('should normalize repeatCount > 1 to isRepeating = true', () => {
    expect(deriveIsRepeating(2)).toBe(true)
    expect(deriveIsRepeating(3)).toBe(true)
    expect(deriveIsRepeating(10)).toBe(true)
  })

  it('should normalize repeatCount = 1 to isRepeating = false', () => {
    expect(deriveIsRepeating(1)).toBe(false)
  })

  it('should normalize repeatCount = 0 to isRepeating = false', () => {
    expect(deriveIsRepeating(0)).toBe(false)
  })

  it('should normalize null/undefined to isRepeating = false', () => {
    expect(deriveIsRepeating(null)).toBe(false)
    expect(deriveIsRepeating(undefined)).toBe(false)
  })
})