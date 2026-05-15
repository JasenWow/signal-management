import { useState, useEffect } from 'react'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'
import { useTagStore } from '@/domains/tag/hooks/use-tag-store'
import { DEFAULT_SIGNAL_COLORS, DATA_TYPE_BIT_LENGTH_MAP } from '@/foundation/lib/constants'
import type { ByteOrder, SignalDataType, Tag } from '@/foundation/types'
import { TagInput } from '@/domains/tag/components/tag-input'

interface SignalFormProps {
  mode: 'create' | 'edit'
  onClose: () => void
}

export function SignalForm({ mode, onClose }: SignalFormProps) {
  const {
    createSignal, updateSignal,
    activeMessageId, selectedSignalId,
    activeSignals, activeGroups, pendingSelection,
  } = useMessageStore()

  const editingSignal = mode === 'edit' ? activeSignals.find((s) => s.id === selectedSignalId) : null
  const groupFromPending = pendingSelection?.groupId
    ? activeGroups.find((g) => g.id === pendingSelection.groupId)
    : null
  const signalGroup = editingSignal?.groupId
    ? activeGroups.find((g) => g.id === editingSignal.groupId)
    : groupFromPending
  const isInGroup = !!signalGroup

  const [name, setName] = useState(editingSignal?.name ?? '')
  const [startBit, setStartBit] = useState(
    editingSignal?.startBit ?? pendingSelection?.startBit ?? 0
  )
  const [bitLength, setBitLength] = useState(
    editingSignal?.bitLength ?? pendingSelection?.bitLength ?? 1
  )
  const [byteOrder, setByteOrder] = useState<ByteOrder>(editingSignal?.byteOrder ?? 'big')
  const [factor, setFactor] = useState(editingSignal?.factor ?? 1)
  const [offset, setOffset] = useState(editingSignal?.offset ?? 0)
  const [unit, setUnit] = useState(editingSignal?.unit ?? '')
  const [color, setColor] = useState(
    editingSignal?.color ?? DEFAULT_SIGNAL_COLORS[activeSignals.length % DEFAULT_SIGNAL_COLORS.length]
  )
  const [positionMode, setPositionMode] = useState<'absolute' | 'byteBit'>('absolute')
  const [error, setError] = useState('')

  const [dataType, setDataType] = useState<SignalDataType | null>(editingSignal?.dataType ?? null)
  const [signalTags, setSignalTags] = useState<Tag[]>([])

  const { loadTags } = useTagStore()
  const { assignTagsToSignal } = useTagStore()

  useEffect(() => { loadTags() }, [loadTags])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!activeMessageId) return setError('No active message')
    if (!name.trim()) return setError('Signal name is required')
    if (bitLength < 1) return setError('Bit length must be at least 1')

    try {
      const signalData = {
        name: name.trim(), startBit, bitLength, byteOrder, factor, offset, unit, color,
        dataType: dataType ?? undefined,
        groupId: signalGroup?.id ?? null,
      }

      if (editingSignal) {
        await updateSignal(editingSignal.id, signalData)
        if (signalTags.length > 0) {
          await assignTagsToSignal(editingSignal.id, signalTags.map((t) => t.id))
        }
      } else {
        await createSignal(signalData)
        const createdSignalId = activeSignals[activeSignals.length - 1]?.id
        if (signalTags.length > 0 && createdSignalId) {
          await assignTagsToSignal(createdSignalId, signalTags.map((t) => t.id))
        }
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signal')
    }
  }

  const displayStartByte = Math.floor(startBit / 8)
  const displayStartBitInByte = startBit % 8

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <form
        className="bg-white rounded-lg shadow-xl p-5 w-[400px] space-y-3"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="text-base font-semibold border-b pb-2">
          {editingSignal ? `Edit: ${editingSignal.name}` : 'Define New Signal'}
        </h3>

        {isInGroup && signalGroup && (
          <div className="text-xs font-medium px-2.5 py-1.5 rounded" style={{ backgroundColor: signalGroup.color + '15', color: signalGroup.color }}>
            In group: {signalGroup.name}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-1.5">{error}</div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">Name *</label>
          <input
            className="w-full border rounded px-2.5 py-1.5 text-sm"
            placeholder="e.g. EngineRPM"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <div className="flex items-center gap-1 text-xs mb-1">
            <span className="text-gray-400">Position:</span>
            <button
              type="button"
              className={`px-1.5 py-0.5 rounded font-mono ${positionMode === 'absolute' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setPositionMode('absolute')}
            >
              Absolute
            </button>
            <button
              type="button"
              className={`px-1.5 py-0.5 rounded font-mono ${positionMode === 'byteBit' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setPositionMode('byteBit')}
            >
              Byte:Bit
            </button>
          </div>

          {positionMode === 'absolute' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-0.5">Start Bit</label>
                <input
                  type="number" min={0}
                  className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
                  value={startBit}
                  onChange={(e) => setStartBit(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-0.5">Bit Length</label>
                <input
                  type="number" min={1}
                  className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
                  value={bitLength}
                  onChange={(e) => setBitLength(Number(e.target.value))}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-0.5">Start Byte</label>
                <input
                  type="number" min={0}
                  className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
                  value={displayStartByte}
                  onChange={(e) => setStartBit(Number(e.target.value) * 8 + displayStartBitInByte)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-0.5">Bit in Byte</label>
                <input
                  type="number" min={0} max={7}
                  className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
                  value={displayStartBitInByte}
                  onChange={(e) => setStartBit(displayStartByte * 8 + Math.min(7, Math.max(0, Number(e.target.value))))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-0.5">Bit Length</label>
                <input
                  type="number" min={1}
                  className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
                  value={bitLength}
                  onChange={(e) => setBitLength(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Data Type</label>
            <select
              className="w-full border rounded px-2.5 py-1.5 text-sm"
              value={dataType ?? ''}
              onChange={(e) => {
                const val = e.target.value as SignalDataType | ''
                const newType = val === '' ? null : val
                setDataType(newType)
                if (newType && newType in DATA_TYPE_BIT_LENGTH_MAP) {
                  setBitLength(DATA_TYPE_BIT_LENGTH_MAP[newType])
                }
              }}
            >
              <option value="">未设置</option>
              <optgroup label="整数类型">
                <option value="uint8">uint8</option>
                <option value="int8">int8</option>
                <option value="uint16">uint16</option>
                <option value="int16">int16</option>
                <option value="uint32">uint32</option>
                <option value="int32">int32</option>
                <option value="uint64">uint64</option>
                <option value="int64">int64</option>
              </optgroup>
              <optgroup label="浮点类型">
                <option value="float32">float32</option>
                <option value="float64">float64</option>
              </optgroup>
              <optgroup label="其他">
                <option value="boolean">boolean</option>
                <option value="bcd_time">bcd_time (BCD时间码)</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Byte Order</label>
            <select
              className="w-full border rounded px-2.5 py-1.5 text-sm"
              value={byteOrder}
              onChange={(e) => setByteOrder(e.target.value as ByteOrder)}
            >
              <option value="big">Big-Endian</option>
              <option value="little">Little-Endian</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Factor</label>
            <input
              type="number" step="any"
              className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
              value={factor}
              onChange={(e) => setFactor(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Offset</label>
            <input
              type="number" step="any"
              className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">Unit</label>
          <input
            className="w-full border rounded px-2.5 py-1.5 text-sm"
            placeholder="e.g. rpm, km/h, %"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">Tags</label>
          <TagInput
            selectedTags={signalTags}
            onAdd={(tag) => setSignalTags((prev) => [...prev, tag])}
            onRemove={(tagId) => setSignalTags((prev) => prev.filter((t) => t.id !== tagId))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="w-8 h-8 rounded border cursor-pointer p-0.5"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <div className="flex gap-1 flex-wrap">
              {DEFAULT_SIGNAL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-5 h-5 rounded-sm border-2 ${color === c ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
            {editingSignal ? 'Update' : 'Create Signal'}
          </button>
        </div>
      </form>
    </div>
  )
}
