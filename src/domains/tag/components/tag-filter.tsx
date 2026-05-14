import { useEffect, useState } from 'react'
import { useTagStore } from '../hooks/use-tag-store'

interface TagFilterProps {
  selectedTagIds: string[]
  onToggle: (tagId: string) => void
}

const VISIBLE_LIMIT = 20

export function TagFilter({ selectedTagIds, onToggle }: TagFilterProps) {
  const { tags, loading, loadTags } = useTagStore()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (tags.length === 0 && !loading) {
      loadTags()
    }
  }, [tags.length, loading, loadTags])

  const visibleTags = expanded ? tags : tags.slice(0, VISIBLE_LIMIT)
  const hiddenCount = tags.length - VISIBLE_LIMIT

  if (loading) {
    return (
      <div className="flex flex-wrap gap-1 p-2">
        <span className="text-xs text-gray-400">Loading tags…</span>
      </div>
    )
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1 p-2">
      {visibleTags.map((tag: { id: string; name: string; color: string }) => {
        const isSelected = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={[
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-colors',
              isSelected
                ? 'ring-1 ring-offset-1 border-transparent'
                : 'border-gray-200 hover:bg-gray-50',
            ].join(' ')}
            style={
              isSelected
                ? {
                    backgroundColor: `${tag.color}33`,
                    color: tag.color,
                    boxShadow: `0 0 0 1px ${tag.color}`,
                  }
                : undefined
            }
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </button>
        )
      })}

      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  )
}
