import { createHash } from 'node:crypto'

export function generateSignalId(
  messageId: string,
  name: string,
  startBit: number,
  bitLength: number
): string {
  if (typeof messageId !== 'string' || messageId.trim().length === 0) {
    throw new Error('messageId must be a non-empty string')
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('name must be a non-empty string')
  }

  if (typeof startBit !== 'number' || startBit < 0 || !Number.isInteger(startBit)) {
    throw new Error('startBit must be a non-negative integer')
  }

  if (typeof bitLength !== 'number' || bitLength <= 0 || !Number.isInteger(bitLength)) {
    throw new Error('bitLength must be a positive integer')
  }

  const payload = JSON.stringify([messageId, name, startBit, bitLength])
  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}
