import { useMessageStore } from '../../stores/messageStore'

interface SignalListProps {
  onEdit: () => void
}

export function SignalList({ onEdit }: SignalListProps) {
  const { activeMessageId, activeSignals, selectedSignalId, setSelectedSignal, deleteSignal } = useMessageStore()

  if (!activeMessageId) {
    return <div className="p-3 text-sm text-gray-400">Select a message first</div>
  }

  if (activeSignals.length === 0) {
    return (
      <div className="p-3 text-sm text-gray-400 text-center">
        No signals yet.<br />Drag on the canvas or click <strong>+ Add</strong> above.
      </div>
    )
  }

  return (
    <div>
      {activeSignals.map((signal) => (
        <div
          key={signal.id}
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm border-b border-gray-50 group ${
            selectedSignalId === signal.id ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => setSelectedSignal(signal.id)}
        >
          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: signal.color }} />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-xs">{signal.name}</div>
            <div className="text-[10px] text-gray-400 font-mono">
              bit {signal.startBit}-{signal.startBit + signal.bitLength - 1} ({signal.bitLength}b)
              {signal.unit ? ` · ${signal.unit}` : ''}
            </div>
          </div>
          <button
            className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Edit"
            onClick={(e) => { e.stopPropagation(); setSelectedSignal(signal.id); onEdit() }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
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
        </div>
      ))}
    </div>
  )
}
