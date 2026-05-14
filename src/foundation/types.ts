export type ByteOrder = 'big' | 'little'
export type SignalDataType = 'uint8' | 'int8' | 'uint16' | 'int16' | 'uint32' | 'int32' | 'uint64' | 'int64' | 'float32' | 'float64' | 'boolean'
export type BitNumbering = 'msb0' | 'lsb0'

export interface Message {
  id: string
  name: string
  description: string
  frameSize: number
  byteOrder: ByteOrder
  tags?: Tag[]
  createdAt: string
  updatedAt: string
}

export interface Signal {
  id: string
  messageId: string
  name: string
  description: string
  startBit: number
  bitLength: number
  byteOrder: ByteOrder
  factor: number
  offset: number
  unit: string
  minimum: number | null
  maximum: number | null
  valueTableId: string | null
  dataType: SignalDataType | null
  color: string
  tags?: Tag[]
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ValueTable {
  id: string
  name: string
  description: string
  entries: ValueTableEntry[]
  createdAt: string
  updatedAt: string
}

export interface ValueTableEntry {
  id: string
  valueTableId: string
  rawValue: number
  displayValue: string
  description: string
  sortOrder: number
}

export interface Version {
  id: string
  messageId: string | null
  parentId: string | null
  message: string
  snapshot: VersionSnapshot
  diff: unknown | null
  createdAt: string
}

export interface VersionSnapshot {
  message: Message
  signals: Signal[]
  valueTables: ValueTable[]
  messageTags: Tag[]
  signalTags: { signalId: string; tags: Tag[] }[]
}

export interface VersionSummary {
  id: string
  messageId: string | null
  parentId: string | null
  message: string
  createdAt: string
}

export interface CreateMessageInput {
  name: string
  description?: string
  frameSize: number
  byteOrder?: ByteOrder
}

export interface UpdateMessageInput {
  name?: string
  description?: string
  frameSize?: number
  byteOrder?: ByteOrder
}

export interface CreateSignalInput {
  name: string
  description?: string
  startBit: number
  bitLength: number
  byteOrder?: ByteOrder
  factor?: number
  offset?: number
  unit?: string
  minimum?: number | null
  maximum?: number | null
  valueTableId?: string | null
  dataType?: SignalDataType
  color?: string
}

export interface UpdateSignalInput {
  name?: string
  description?: string
  startBit?: number
  bitLength?: number
  byteOrder?: ByteOrder
  factor?: number
  offset?: number
  unit?: string
  minimum?: number | null
  maximum?: number | null
  valueTableId?: string | null
  dataType?: SignalDataType
  color?: string
}

export interface OverlapCheckResult {
  hasOverlap: boolean
  conflictingSignals: Pick<Signal, 'id' | 'name'>[]
}

export interface BitRegion {
  startBit: number
  bitLength: number
}

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface CreateTagInput {
  name: string
  color?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}
