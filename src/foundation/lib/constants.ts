export const BITS_PER_BYTE = 8

export const MAX_FRAME_SIZE = 64

export const DEFAULT_CELL_SIZE = 56
export const DEFAULT_SIGNAL_COLORS = [
  '#2563EB', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#DB2777', '#0891B2', '#EA580C',
  '#4F46E5', '#15803D', '#B45309', '#BE123C',
  '#6D28D9', '#9333EA', '#0E7490', '#C2410C',
]

export const SIGNAL_DATA_TYPES = ['uint8', 'int8', 'uint16', 'int16', 'uint32', 'int32', 'uint64', 'int64', 'float32', 'float64', 'boolean'] as const

export const DATA_TYPE_BIT_LENGTH_MAP = {
  uint8: 8,
  int8: 8,
  uint16: 16,
  int16: 16,
  uint32: 32,
  int32: 32,
  uint64: 64,
  int64: 64,
  float32: 32,
  float64: 64,
  boolean: 1,
} as const

export const DEFAULT_TAG_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#14B8A6', '#F59E0B', '#6366F1',
] as const
