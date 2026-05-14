import { useNavigate } from 'react-router'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'
import { MessageEditor } from '@/domains/message/components/message-editor'

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { messages, activeMessageId } = useMessageStore()

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">
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
      {children}
    </div>
  )
}
