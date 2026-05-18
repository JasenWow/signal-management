export function extractMessagePrefix(messageName: string): string {
  const letters = messageName.replace(/[^a-zA-Z]/g, '').toUpperCase()
  const padded = letters.padEnd(3, '0')
  return padded.slice(0, 3)
}

export function generateSignalCode(messageName: string, existingCodes: string[]): string {
  const prefix = extractMessagePrefix(messageName)

  let maxSeq = 0
  for (const code of existingCodes) {
    if (code.startsWith(prefix + '-')) {
      const seqPart = code.slice(prefix.length + 1)
      const seq = parseInt(seqPart, 10)
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq
      }
    }
  }

  const seq = String(maxSeq + 1).padStart(2, '0')
  return `${prefix}-${seq}`
}
