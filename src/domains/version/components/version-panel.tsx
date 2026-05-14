import { useState } from 'react'
import { useVersionStore } from '../hooks/use-version-store'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'

export function VersionPanel() {
  const { activeMessageId } = useMessageStore()
  const { versions, commit, rollback } = useVersionStore()
  const [commitMessage, setCommitMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)

  async function handleCommit() {
    if (!activeMessageId || !commitMessage.trim()) return
    setIsCommitting(true)
    await commit(activeMessageId, commitMessage.trim())
    setCommitMessage('')
    setIsCommitting(false)
  }

  async function handleRollback(versionId: string) {
    if (!confirm('Rollback to this version? This will create a new version with the old state.')) return
    await rollback(versionId)
    if (activeMessageId) {
      await useMessageStore.getState().selectMessage(activeMessageId)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 mb-2">Version History</h2>
        {activeMessageId && (
          <div className="flex gap-1">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              placeholder="Commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
              disabled={isCommitting}
            />
            <button
              className="px-3 py-1 text-sm bg-green-500 text-white rounded disabled:opacity-50"
              onClick={handleCommit}
              disabled={isCommitting || !commitMessage.trim()}
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-3 text-sm text-gray-400">No versions yet. Save a version to start tracking changes.</div>
        ) : (
          versions.map((v, idx) => (
            <div
              key={v.id}
              className={`px-3 py-2 border-b border-gray-50 text-sm ${
                idx === 0 ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{v.message || '(no message)'}</span>
                {idx === 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">latest</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
                {idx > 0 && (
                  <button
                    className="text-xs text-blue-500 hover:underline"
                    onClick={() => handleRollback(v.id)}
                  >
                    Rollback
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
