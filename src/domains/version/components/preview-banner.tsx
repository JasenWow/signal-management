export function PreviewBanner({ commitMessage, onExit }: { commitMessage: string; onExit: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-amber-800">
        正在查看历史版本: {commitMessage}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onExit}
          className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300"
        >
          退出预览
        </button>
        <button
          onClick={onExit}
          className="text-sm text-amber-600 hover:text-amber-800"
          aria-label="关闭"
        >
          ×
        </button>
      </div>
    </div>
  )
}