import { describe, it, expect } from 'bun:test'
import { generateSignalCode, extractMessagePrefix } from './signal-code'

describe('extractMessagePrefix', () => {
  it('extracts first 3 uppercase letters from snake_case name', () => {
    expect(extractMessagePrefix('BMS_Status')).toBe('BMS')
  })

  it('extracts first 3 uppercase letters from CamelCase name', () => {
    expect(extractMessagePrefix('ChargerControl')).toBe('CHA')
  })

  it('pads short names to 3 chars', () => {
    expect(extractMessagePrefix('VC')).toBe('VC0')
  })

  it('handles single char name', () => {
    expect(extractMessagePrefix('X')).toBe('X00')
  })

  it('skips non-letter characters', () => {
    expect(extractMessagePrefix('123_ABC')).toBe('ABC')
  })

  it('lowercase names are uppercased', () => {
    expect(extractMessagePrefix('voltage')).toBe('VOL')
  })
})

describe('generateSignalCode', () => {
  it('generates first code for message with no existing codes', () => {
    expect(generateSignalCode('BMS_Status', [])).toBe('BMS-01')
  })

  it('increments from existing codes', () => {
    expect(generateSignalCode('BMS_Status', ['BMS-01'])).toBe('BMS-02')
  })

  it('finds max seq from unordered existing codes', () => {
    expect(generateSignalCode('BMS_Status', ['BMS-03', 'BMS-01', 'BMS-05'])).toBe('BMS-06')
  })

  it('ignores codes from different prefix', () => {
    expect(generateSignalCode('Charger_Control', ['BMS-01', 'BMS-02'])).toBe('CHA-01')
  })

  it('pads to 3 chars for short message names', () => {
    expect(generateSignalCode('VC', [])).toBe('VC0-01')
  })

  it('formats seq as zero-padded two digits', () => {
    const codes = Array.from({ length: 9 }, (_, i) => `BMS-${String(i + 1).padStart(2, '0')}`)
    expect(generateSignalCode('BMS_Status', codes)).toBe('BMS-10')
  })
})
