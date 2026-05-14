import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'
import { useVersionStore } from '@/domains/version/hooks/use-version-store'
import { SignalList } from '@/domains/signal/components/signal-list'
import { SignalForm } from '@/domains/signal/components/signal-form'
import { BitCanvas } from '@/domains/signal/components/bit-canvas'
import { VersionPanel } from '@/domains/version/components/version-panel'
import { TagFilter } from '@/domains/tag/components/tag-filter'

export function MessageShowPage() {
  const { messageId } = useParams<{ messageId: string }>()
  const navigate = useNavigate()
  const { activeMessageId, activeMessage, loadMessages, selectMessage, addSignal } = useMessageStore()
  const { loadVersions } = useVersionStore()
  const [signalFormMode, setSignalFormMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (activeMessageId) {
      loadVersions(activeMessageId)
    }
  }, [activeMessageId, loadVersions])

  useEffect(() => {
    if (messageId) {
      selectMessage(messageId).catch(() => {
        navigate('/', { replace: true })
      })
    }
  }, [messageId])

  function handleBitSelection(startBit: number, bitLength: number) {
    addSignal({ startBit, bitLength })
    setSignalFormMode('create')
  }

  function handleEditSignal() {
    setSignalFormMode('edit')
  }

  function handleFormClose() {
    setSignalFormMode('closed')
    useMessageStore.getState().setPendingSelection(null)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-60 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="p-2 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signals</h2>
          {activeMessageId && (
            <button
              className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => {
                addSignal({ startBit: 0, bitLength: 1 })
                setSignalFormMode('create')
              }}
            >
              + Add
            </button>
          )}
        </div>
        {activeMessageId && (
          <div className="border-b border-gray-100">
            <TagFilter selectedTagIds={filterTagIds} onToggle={(tagId) => {
              setFilterTagIds((prev) =>
                prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
              )
            }} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          <SignalList onEdit={handleEditSignal} filterTagIds={filterTagIds} />
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex items-start justify-center p-6 bg-gray-50">
        {activeMessage ? (
          <BitCanvas onBitSelection={handleBitSelection} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
            <p>Create or select a message frame to start defining signals</p>
          </div>
        )}
      </main>

      <aside className="w-64 border-l border-gray-200 bg-white shrink-0">
        <VersionPanel />
      </aside>

      {signalFormMode !== 'closed' && activeMessage && (
        <SignalForm
          mode={signalFormMode}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}
