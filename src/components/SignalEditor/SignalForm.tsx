import { useState } from 'react'
import { useMessageStore } from '../../stores/messageStore'
import type { ByteOrder } from '@shared/types'

interface SignalFormProps {
  mode: 'create' | 'edit'
  onClose: () => void
}

export function SignalForm({ mode, onClose }: SignalFormProps) {
  const {
    createSignal, updateSignal,
    activeMessageId, selectedSignalId,
    activeSignals, pendingSelection,
  } = useMessageStore()

  const editingSignal = mode === 'edit' ? activeSignals.find((s) => s.id === selectedSignalId) : null

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
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!activeMessageId) return setError('No active message')
    if (!name.trim()) return setError('Signal name is required')
    if (bitLength < 1) return setError('Bit length must be at least 1')

    try {
      if (editingSignal) {
        await updateSignal(editingSignal.id, {
          name: name.trim(), startBit, bitLength, byteOrder, factor, offset, unit,
        })
      } else {
        await createSignal({
          name: name.trim(), startBit, bitLength, byteOrder, factor, offset, unit,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signal')
    }
  }

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
