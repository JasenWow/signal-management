import { useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'
import { useVersionStore } from '@/domains/version/hooks/use-version-store'
import { SignalList } from '@/domains/signal/components/signal-list'
import { SignalForm } from '@/domains/signal/components/signal-form'
import { BitCanvas } from '@/domains/signal/components/bit-canvas'
import { VersionPanel } from '@/domains/version/components/version-panel'
import { TagFilter } from '@/domains/tag/components/tag-filter'
import { PreviewBanner } from '@/domains/version/components/preview-banner'

export function MessageShowPage() {
  const { messageId } = useParams<{ messageId: string }>()
  const history = useHistory()
  const { activeMessageId, activeMessage, loadMessages, selectMessage, addSignal } = useMessageStore()
  const { versions, previewSnapshot, previewVersionId, isLoadingSnapshot, clearPreview, loadVersions } = useVersionStore()
  const isPreviewMode = previewSnapshot !== null
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
        history.replace('/')
      })
    }
  }, [messageId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreviewMode) clearPreview()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPreviewMode])

  useEffect(() => {
    if (isPreviewMode && previewSnapshot) {
      useMessageStore.setState({
        activeMessage: previewSnapshot.message,
        activeSignals: previewSnapshot.signals
      })
    }
  }, [isPreviewMode, previewSnapshot])

  useEffect(() => {
    if (!isPreviewMode && activeMessageId) {
      selectMessage(activeMessageId)
    }
  }, [isPreviewMode, activeMessageId])

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
          {activeMessageId && !isPreviewMode && (
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
          <SignalList onEdit={handleEditSignal} filterTagIds={filterTagIds} readOnly={isPreviewMode} />
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex items-start justify-center p-6 bg-gray-50 relative">
        {isLoadingSnapshot && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isPreviewMode && previewVersionId && (
          <PreviewBanner
            commitMessage={versions.find(v => v.id === previewVersionId)?.message || ''}
            onExit={clearPreview}
          />
        )}
        {activeMessage ? (
          <BitCanvas onBitSelection={handleBitSelection} readOnly={isPreviewMode} />
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
