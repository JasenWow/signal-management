import { useState, useEffect } from 'react'
import { useMessageStore } from '../hooks/use-message-store'
import { TagInput } from '@/domains/tag/components/tag-input'
import { useTagStore } from '@/domains/tag/hooks/use-tag-store'
import type { Tag } from '@/foundation/types'

export function MessageEditor() {
  const { activeMessage, activeMessageId, createMessage, updateMessage, deleteMessage, importSpec } = useMessageStore()
  const { assignTagsToMessage, removeTagFromMessage } = useTagStore()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [frameSize, setFrameSize] = useState(8)
  const [localName, setLocalName] = useState<string | null>(null)
  const [localFrameSize, setLocalFrameSize] = useState<string | null>(null)
  const [messageTags, setMessageTags] = useState<Tag[]>(activeMessage?.tags ?? [])

  useEffect(() => {
    setMessageTags(activeMessage?.tags ?? [])
  }, [activeMessage?.id])

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

  function handleExport() {
    if (!activeMessage) return
    const { activeSignals, activeGroups } = useMessageStore.getState()
    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      message: {
        name: activeMessage.name,
        description: activeMessage.description,
        frameSize: activeMessage.frameSize,
        byteOrder: activeMessage.byteOrder,
      },
      signalGroups: activeGroups.map(g => ({
        name: g.name,
        description: g.description,
        startBit: g.startBit,
        bitWidth: g.bitWidth,
        isRepeating: g.isRepeating,
        repeatCount: g.repeatCount,
        color: g.color,
        sortOrder: g.sortOrder,
      })),
      signals: activeSignals.map(s => {
        const group = s.groupId ? activeGroups.find(g => g.id === s.groupId) : null
        return {
          name: s.name,
          description: s.description,
          startBit: s.startBit,
          bitLength: s.bitLength,
          byteOrder: s.byteOrder,
          factor: s.factor,
          offset: s.offset,
          unit: s.unit,
          minimum: s.minimum,
          maximum: s.maximum,
          color: s.color,
          sortOrder: s.sortOrder,
          groupName: group?.name ?? null,
        }
      }),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeMessage.name || 'message-spec'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.message || !data.signals) {
          alert('Invalid spec file')
          return
        }
        await importSpec(data)
      } catch {
        alert('Failed to import spec file')
      }
    }
    input.click()
  }

  const displayName = localName ?? activeMessage?.name ?? ''
  const displayFrameSize = localFrameSize ?? String(activeMessage?.frameSize ?? 8)

  return (
    <>
      {activeMessage && (
        <div className="flex items-center gap-2 ml-auto">
          <input
            className="border rounded px-2 py-1 text-sm w-28"
            value={displayName}
            onChange={(e) => setLocalName(e.target.value)}
            onFocus={() => setLocalName(activeMessage.name)}
            onBlur={() => {
              setLocalName(null)
              if (displayName.trim() && displayName !== activeMessage.name) {
                updateMessage(activeMessage.id, { name: displayName.trim() })
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
              value={displayFrameSize}
              onChange={(e) => setLocalFrameSize(e.target.value)}
              onFocus={() => setLocalFrameSize(String(activeMessage.frameSize))}
              onBlur={() => {
                const v = Number(displayFrameSize)
                setLocalFrameSize(null)
                if (v > 0 && v !== activeMessage.frameSize) {
                  updateMessage(activeMessage.id, { frameSize: v })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
            />
          </div>
          <TagInput
            selectedTags={messageTags}
            onAdd={async (tag) => {
              await assignTagsToMessage(activeMessage.id, [tag.id])
              setMessageTags((prev) => [...prev, tag])
            }}
            onRemove={async (tagId) => {
              await removeTagFromMessage(activeMessage.id, tagId)
              setMessageTags((prev) => prev.filter((t) => t.id !== tagId))
            }}
          />
          <button className="text-xs px-1.5 py-1 text-gray-500 hover:bg-gray-100 rounded" onClick={handleExport} title="Export spec">
            Export
          </button>
          <button className="text-red-400 text-xs px-1.5 py-1 hover:bg-red-50 rounded" onClick={handleDelete}>
            Delete
          </button>
        </div>
      )}

      <button
        className="px-2.5 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 shrink-0"
        onClick={handleImport}
      >
        Import
      </button>
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
