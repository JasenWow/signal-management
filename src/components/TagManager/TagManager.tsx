import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useTagStore } from '../../stores/tagStore'
import { useMessageStore } from '../../stores/messageStore'
import { DEFAULT_TAG_COLORS } from '@shared/constants'
import type { Tag, Message } from '@shared/types'

interface MessageWithSignals extends Message {
  signals?: Array<{
    id: string
    name: string
    tags?: Tag[]
    [key: string]: unknown
  }>
}

export function TagManager() {
  const navigate = useNavigate()
  const { tags, loadTags, createTag, updateTag, deleteTag } = useTagStore()
  const { messages, loadMessages } = useMessageStore()
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editTag, setEditTag] = useState<Tag | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>(DEFAULT_TAG_COLORS[0])
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    loadTags()
    loadMessages()
  }, [loadTags, loadMessages])

  const taggedMessages = selectedTag
    ? (messages as MessageWithSignals[]).filter((m) =>
        (m.tags ?? []).some((t) => t.id === selectedTag.id)
      )
    : []

  const taggedSignals = selectedTag
    ? (messages as MessageWithSignals[]).flatMap((m) =>
        (m.signals ?? [])
          .filter((s) => (s.tags ?? []).some((t) => t.id === selectedTag.id))
          .map((s) => ({ id: s.id, name: s.name, messageName: m.name, messageId: m.id }))
      )
    : []

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      await createTag(newName.trim(), newColor)
      setNewName('')
      setNewColor(DEFAULT_TAG_COLORS[0])
      setShowCreate(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create tag')
    }
  }

  async function handleUpdate() {
    if (!editTag || !editName.trim()) return
    try {
      await updateTag(editTag.id, { name: editName.trim(), color: editColor })
      setEditTag(null)
      setSelectedTag(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update tag')
    }
  }

  async function handleDelete(tag: Tag) {
    if (!confirm(`Delete tag "${tag.name}"? This will remove it from all signals and messages.`)) return
    try {
      await deleteTag(tag.id)
      if (selectedTag?.id === tag.id) setSelectedTag(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete tag')
    }
  }

  return (
    <div className="h-full flex">
      {/* Left: Tag list */}
      <div className="w-72 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tags</h2>
          <button
            className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setShowCreate(true)}
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tags.length === 0 ? (
            <div className="p-3 text-sm text-gray-400 text-center">No tags yet</div>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className={`group flex items-center gap-2 px-3 py-2 cursor-pointer text-sm border-b border-gray-50 ${
                  selectedTag?.id === tag.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTag(tag)}
              >
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="flex-1 truncate">{tag.name}</span>
                <button
                  className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100"
                  title="Edit"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditTag(tag)
                    setEditName(tag.name)
                    setEditColor(tag.color)
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        {selectedTag ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 rounded" style={{ backgroundColor: selectedTag.color }} />
              <h3 className="text-lg font-semibold">{selectedTag.name}</h3>
              <button
                className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
                onClick={() => {
                  setEditTag(selectedTag)
                  setEditName(selectedTag.name)
                  setEditColor(selectedTag.color)
                }}
              >
                Edit
              </button>
              <button
                className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                onClick={() => handleDelete(selectedTag)}
              >
                Delete
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Messages ({taggedMessages.length})</h4>
                {taggedMessages.length === 0 ? (
                  <p className="text-sm text-gray-400">No messages with this tag</p>
                ) : (
                  <div className="space-y-1">
                    {taggedMessages.map((m) => (
                      <div
                        key={m.id}
                        className="text-sm bg-white rounded px-3 py-1.5 border cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/${m.id}`)}
                      >
                        {m.name} ({m.frameSize}B)
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Signals ({taggedSignals.length})</h4>
                {taggedSignals.length === 0 ? (
                  <p className="text-sm text-gray-400">No signals with this tag</p>
                ) : (
                  <div className="space-y-1">
                    {taggedSignals.map((s) => (
                      <div
                        key={s.id}
                        className="text-sm bg-white rounded px-3 py-1.5 border cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/${s.messageId}`)}
                      >
                        {s.name} <span className="text-gray-400">in {s.messageName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>Select a tag to view details</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <form
            className="bg-white rounded-lg shadow-xl p-5 w-80 space-y-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <h3 className="text-base font-semibold">New Tag</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Name *</label>
              <input
                className="w-full border rounded px-2.5 py-1.5 text-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Color</label>
              <div className="flex gap-1 flex-wrap">
                {DEFAULT_TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-sm border-2 ${newColor === c ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" disabled={!newName.trim()}>
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editTag && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditTag(null)}>
          <form
            className="bg-white rounded-lg shadow-xl p-5 w-80 space-y-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdate()
            }}
          >
            <h3 className="text-base font-semibold">Edit Tag</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Name *</label>
              <input
                className="w-full border rounded px-2.5 py-1.5 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Color</label>
              <div className="flex gap-1 flex-wrap">
                {DEFAULT_TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-sm border-2 ${editColor === c ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={() => setEditTag(null)}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" disabled={!editName.trim()}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
