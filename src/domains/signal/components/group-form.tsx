import { useState } from 'react'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'
import { DEFAULT_SIGNAL_COLORS } from '@/foundation/lib/constants'

interface GroupFormProps {
  mode: 'create' | 'edit'
  onClose: () => void
}

export function GroupForm({ mode, onClose }: GroupFormProps) {
  const {
    createGroup, updateGroup,
    activeMessageId, selectedGroupId,
    activeGroups,
  } = useMessageStore()

  const editingGroup = mode === 'edit' ? activeGroups.find((g) => g.id === selectedGroupId) : null

  const [name, setName] = useState(editingGroup?.name ?? '')
  const [description, setDescription] = useState(editingGroup?.description ?? '')
  const [startBit, setStartBit] = useState(editingGroup?.startBit ?? 0)
  const [bitWidth, setBitWidth] = useState(editingGroup?.bitWidth ?? 8)
  const [isRepeating, setIsRepeating] = useState(editingGroup?.isRepeating ?? false)
  const [repeatCount, setRepeatCount] = useState<number | ''>(editingGroup?.repeatCount ?? '')
  const [color, setColor] = useState(
    editingGroup?.color ?? DEFAULT_SIGNAL_COLORS[(activeGroups.length + 3) % DEFAULT_SIGNAL_COLORS.length]
  )
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!activeMessageId) return setError('No active message')
    if (!name.trim()) return setError('Group name is required')
    if (bitWidth < 1) return setError('Bit width must be at least 1')

    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, {
          name: name.trim(), description, startBit, bitWidth, isRepeating,
          repeatCount: repeatCount === '' ? null : repeatCount,
          color,
        })
      } else {
        await createGroup({
          name: name.trim(), description, startBit, bitWidth, isRepeating,
          repeatCount: repeatCount === '' ? null : repeatCount,
          color,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group')
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
          {editingGroup ? `Edit Group: ${editingGroup.name}` : 'New Signal Group'}
        </h3>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-1.5">{error}</div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">Name *</label>
          <input
            className="w-full border rounded px-2.5 py-1.5 text-sm"
            placeholder="e.g. WheelData"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">Description</label>
          <input
            className="w-full border rounded px-2.5 py-1.5 text-sm"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Start Bit (absolute)</label>
            <input
              type="number" min={0}
              className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
              value={startBit}
              onChange={(e) => setStartBit(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Bit Width</label>
            <input
              type="number" min={1}
              className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
              value={bitWidth}
              onChange={(e) => setBitWidth(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">Repeat Count</label>
          <input
            type="number" min={1}
            className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
            placeholder="Leave empty if not repeating"
            value={repeatCount}
            onChange={(e) => {
              const v = e.target.value
              setRepeatCount(v === '' ? '' : Number(v))
              setIsRepeating(v !== '' && Number(v) > 0)
            }}
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Number of cycles. Empty = single occurrence.</p>
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
          <button type="submit" className="px-4 py-1.5 text-sm bg-violet-500 text-white rounded hover:bg-violet-600">
            {editingGroup ? 'Update Group' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  )
}
