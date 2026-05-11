import { useState } from 'react'
import { useMessageStore } from '../../stores/messageStore'
import type { ByteOrder } from '@shared/types'

export function MessageEditor() {
  const { createMessage, updateMessage, deleteMessage, activeMessageId, messages } = useMessageStore()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [frameSize, setFrameSize] = useState(8)

  const activeMessage = messages.find((m) => m.id === activeMessageId)

  async function handleCreate() {
    if (!name.trim()) return
    const msg = await createMessage({ name: name.trim(), frameSize, byteOrder: 'big' })
    setName('')
    setFrameSize(8)
    setShowCreate(false)
    useMessageStore.getState().selectMessage(msg.id)
  }

  async function handleDelete() {
    if (!activeMessageId) return
    if (!confirm('Delete this message and all its signals?')) return
    await deleteMessage(activeMessageId)
  }

  return (
    <>
      {activeMessage && (
        <div className="flex items-center gap-2 ml-auto">
          <input
            className="border rounded px-2 py-1 text-sm w-28"
            value={activeMessage.name}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== activeMessage.name) {
                updateMessage(activeMessage.id, { name: e.target.value.trim() })
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
          />
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-400">Size:</label>
            <input
              type="number" min={1} max={64}
              className="border rounded px-1.5 py-1 text-sm w-14 font-mono"
              value={activeMessage.frameSize}
              onBlur={(e) => {
                const v = Number(e.target.value)
                if (v > 0 && v !== activeMessage.frameSize) {
                  updateMessage(activeMessage.id, { frameSize: v })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
            />
          </div>
          <button className="text-red-400 text-xs px-1.5 py-1 hover:bg-red-50 rounded" onClick={handleDelete}>
            Delete
          </button>
        </div>
      )}

      <button
        className="px-2.5 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0"
        onClick={() => setShowCreate(true)}
      >
        + New Message
      </button>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <form
            className="bg-white rounded-lg shadow-xl p-5 w-80 space-y-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); handleCreate() }}
          >
            <h3 className="text-base font-semibold">New Message Frame</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Name *</label>
              <input
                className="w-full border rounded px-2.5 py-1.5 text-sm"
                placeholder="e.g. CAN_MSG_01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Frame Size (bytes)</label>
              <input
                type="number" min={1} max={64}
                className="w-full border rounded px-2.5 py-1.5 text-sm font-mono"
                value={frameSize}
                onChange={(e) => setFrameSize(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" disabled={!name.trim()}>Create</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
