import { useState, useRef, useEffect, useCallback } from 'react'
import { useTagStore } from '../../stores/tagStore'
import { DEFAULT_TAG_COLORS } from '@shared/constants'
import type { Tag } from '@shared/types'

interface TagInputProps {
  selectedTags: Tag[]
  onAdd: (tag: Tag) => void
  onRemove: (tagId: string) => void
}

export function TagInput({ selectedTags, onAdd, onRemove }: TagInputProps) {
  const tags = useTagStore((s) => s.tags)
  const createTag = useTagStore((s) => s.createTag)

  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedIds = new Set(selectedTags.map((t) => t.id))

  const filtered = input.trim()
    ? tags.filter(
        (t) =>
          t.name.toLowerCase().startsWith(input.toLowerCase()) &&
          !selectedIds.has(t.id)
      )
    : tags.filter((t) => !selectedIds.has(t.id))

  const exactMatch = tags.some(
    (t) => t.name.toLowerCase() === input.trim().toLowerCase()
  )

  const canCreate = input.trim().length > 0 && !exactMatch

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClose])

  function handleSelect(tag: Tag) {
    onAdd(tag)
    setInput('')
    setOpen(false)
  }

  async function handleCreate() {
    const name = input.trim()
    if (!name) return
    try {
      const color = DEFAULT_TAG_COLORS[tags.length % DEFAULT_TAG_COLORS.length]
      const tag = await createTag(name, color)
      onAdd(tag)
      setInput('')
      setOpen(false)
    } catch {
      // Creation failed - keep input so user can retry
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0 && filtered[0]) {
        handleSelect(filtered[0])
      } else if (canCreate) {
        handleCreate()
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1 border rounded px-2 py-1 text-sm min-h-[32px]">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 bg-gray-50 rounded pl-1.5 pr-1 py-0.5 text-xs"
          >
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 ml-0.5"
              onClick={() => onRemove(tag.id)}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
          placeholder={selectedTags.length === 0 ? 'Add tags...' : ''}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute z-10 bg-white border rounded shadow-lg max-h-40 overflow-y-auto w-full mt-1">
          {filtered.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer text-left"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(tag)}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer text-left text-gray-500 italic"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create &lsquo;{input.trim()}&rsquo;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
