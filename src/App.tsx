import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router'
import { useMessageStore } from './stores/messageStore'
import { useVersionStore } from './stores/versionStore'
import { MessageEditor } from './components/MessageEditor/MessageEditor'
import { SignalList } from './components/SignalEditor/SignalList'
import { SignalForm } from './components/SignalEditor/SignalForm'
import { BitCanvas } from './components/BitCanvas/BitCanvas'
import { VersionPanel } from './components/VersionPanel/VersionPanel'
import { TagFilter } from './components/TagFilter/TagFilter'
import { TagManager } from './components/TagManager'

export default function App() {
  const { messageId } = useParams<{ messageId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isTagsPage = location.pathname === '/tags'
  const { messages, activeMessageId, activeMessage, loadMessages, selectMessage, addSignal } = useMessageStore()
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
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="h-12 border-b border-gray-200 bg-white flex items-center px-4 gap-4 shrink-0">
        <h1 className="text-base font-bold tracking-tight">Signal Mgmt</h1>
        <div className="h-5 w-px bg-gray-200" />
        <select
          className="border rounded px-2 py-1 text-sm bg-white"
          value={activeMessageId ?? ''}
          onChange={(e) => {
            const value = e.target.value
            if (value) {
              navigate(`/${value}`)
            } else {
              navigate('/')
            }
          }}
        >
          <option value="">-- Select Message --</option>
          {messages.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.frameSize}B)</option>
          ))}
        </select>
        <MessageEditor />
        <button
          className="px-2.5 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 shrink-0"
          onClick={() => navigate('/tags')}
        >
          Tags
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {isTagsPage ? (
          <TagManager />
        ) : (
        <>

        {/* Left: Signal list */}
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

        {/* Center: Canvas */}
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

        {/* Right: Version panel */}
        <aside className="w-64 border-l border-gray-200 bg-white shrink-0">
          <VersionPanel />
        </aside>
        </>
        )}
      </div>

      {/* Signal form modal */}
      {signalFormMode !== 'closed' && activeMessage && (
        <SignalForm
          mode={signalFormMode}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}
