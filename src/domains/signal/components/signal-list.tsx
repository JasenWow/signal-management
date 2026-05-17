import { useState } from 'react'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'
import { bitPosLabel } from '@/foundation/lib/bit-position'

interface SignalListProps {
  onEdit: () => void
  onEditGroup?: () => void
  filterTagIds?: string[]
  readOnly?: boolean
}

export function SignalList({ onEdit, onEditGroup, filterTagIds = [], readOnly = false }: SignalListProps) {
  const { activeMessageId, activeSignals, activeGroups, selectedSignalId, setSelectedSignal,
    selectedGroupId, setSelectedGroup, deleteSignal, deleteGroup, bitNumbering } = useMessageStore()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  if (!activeMessageId) {
    return <div className="p-3 text-sm text-gray-400">Select a message first</div>
  }

  if (activeSignals.length === 0 && activeGroups.length === 0) {
    return (
      <div className="p-3 text-sm text-gray-400 text-center">
        No signals yet.<br />Drag on the canvas or click <strong>+ Add</strong> above.
      </div>
    )
  }

  // Partition signals
  const ungroupedSignals = activeSignals.filter((s) => !s.groupId)
  const groupedSignals = new Map<string, typeof activeSignals>()
  for (const signal of activeSignals) {
    if (signal.groupId) {
      const list = groupedSignals.get(signal.groupId) ?? []
      list.push(signal)
      groupedSignals.set(signal.groupId, list)
    }
  }

  // Apply tag filter
  const filterFn = filterTagIds.length > 0
    ? (signal: typeof activeSignals[0]) => {
        const signalTagIds = (signal.tags ?? []).map((t) => t.id)
        return filterTagIds.some((id) => signalTagIds.includes(id))
      }
    : () => true

  const filteredUngrouped = ungroupedSignals.filter(filterFn)

  function toggleCollapse(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  function renderSignalRow(signal: typeof activeSignals[0], isGroupMember: boolean) {
    const posLabel = `${bitPosLabel(signal.startBit, bitNumbering)} — ${bitPosLabel(signal.startBit + signal.bitLength - 1, bitNumbering)} (${signal.bitLength}b)`

    return (
      <div
        key={signal.id}
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm border-b border-gray-50 group ${
          isGroupMember ? 'pl-8' : ''
        } ${selectedSignalId === signal.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
        onClick={() => setSelectedSignal(signal.id)}
      >
        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: signal.color }} />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-xs">{signal.name}</div>
          <div className="text-[10px] text-gray-400 font-mono">
            {posLabel}
            {signal.unit ? ` · ${signal.unit}` : ''}
          </div>
        </div>
        {(signal.tags ?? []).length > 0 && (
          <div className="flex items-center gap-0.5 shrink-0">
            {(signal.tags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[10px] leading-tight"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
            {(signal.tags ?? []).length > 3 && (
              <span className="text-[10px] text-gray-400">+{(signal.tags ?? []).length - 3}</span>
            )}
          </div>
        )}
        {!readOnly && (
          <button
            className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Edit"
            onClick={(e) => { e.stopPropagation(); setSelectedSignal(signal.id); onEdit() }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
        )}
        {!readOnly && (
          <button
            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Delete "${signal.name}"?`)) deleteSignal(signal.id)
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Ungrouped (header) signals */}
      {filteredUngrouped.map((signal) => renderSignalRow(signal, false))}

      {/* Groups with their signals */}
      {activeGroups.map((group) => {
        const members = groupedSignals.get(group.id) ?? []
        const filteredMembers = members.filter(filterFn)
        const isCollapsed = collapsedGroups.has(group.id)

        return (
          <div key={group.id}>
            {/* Group header */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs border-b border-gray-100 group ${
                selectedGroupId === group.id ? 'bg-violet-50' : 'hover:bg-gray-50'
              }`}
              style={{ borderLeft: `3px solid ${group.color}` }}
              onClick={() => toggleCollapse(group.id)}
            >
              <button
                className="text-gray-400 text-[10px] shrink-0"
                onClick={(e) => { e.stopPropagation(); toggleCollapse(group.id) }}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{group.name}</span>
                <span className="text-gray-400 ml-1">
                  {group.repeatCount != null ? `x${group.repeatCount} · ` : ''}{group.bitWidth}b
                </span>
              </div>
              {onEditGroup && !readOnly && (
                <button
                  className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Edit Group"
                  onClick={(e) => { e.stopPropagation(); setSelectedGroup(group.id); onEditGroup() }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              )}
              {!readOnly && (
                <button
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Delete Group"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete group "${group.name}" and its ${members.length} signal(s)?`)) {
                      deleteGroup(group.id)
                    }
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>

            {/* Group member signals */}
            {!isCollapsed && filteredMembers.map((signal) => renderSignalRow(signal, true))}
          </div>
        )
      })}
    </div>
  )
}
