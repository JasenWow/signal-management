import type { BitNumbering } from '@/foundation/types'

export function getBitLabel(bitInByte: number, numbering: BitNumbering): string {
  if (numbering === 'msb0') {
    return String(7 - bitInByte)
  }
  return String(bitInByte)
}

export function bitPosLabel(absBit: number, numbering: BitNumbering): string {
  const byteIdx = Math.floor(absBit / 8)
  const bitInByte = absBit % 8
  const bitLabel = getBitLabel(bitInByte, numbering)
  return `B${byteIdx}:${bitLabel}`
}
