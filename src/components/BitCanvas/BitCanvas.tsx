import { useRef, useState, useCallback } from 'react'
import { useMessageStore } from '../../stores/messageStore'
import { useCanvasSelection } from '../../hooks/useCanvasSelection'
import { SignalOverlay } from './SignalOverlay'
import { DEFAULT_CELL_SIZE } from '@shared/constants'

interface BitCanvasProps {
  onBitSelection: (startBit: number, bitLength: number) => void
}

export function BitCanvas({ onBitSelection }: BitCanvasProps) {
  const { activeMessageId, activeSignals, selectedSignalId, messages } = useMessageStore()
  const message = messages.find((m) => m.id === activeMessageId)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredBit, setHoveredBit] = useState<number | null>(null)
  const [dragPreview, setDragPreview] = useState<{ startBit: number; bitLength: number } | null>(null)

  const cellSize = DEFAULT_CELL_SIZE
  const frameSize = message?.frameSize ?? 0

  const { handleMouseDown, handleMouseMove, handleMouseUp } = useCanvasSelection({
    frameSize,
    cellSize,
    onComplete: onBitSelection,
  })

  if (!message) return null

  const width = 8 * cellSize
  const height = frameSize * cellSize

  const getBitIndex = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return null
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = width / rect.width
      const scaleY = height / rect.height
      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY
      const col = Math.floor(x / cellSize)
      const row = Math.floor(y / cellSize)
      if (col < 0 || col > 7 || row < 0 || row >= frameSize) return null
      return row * 8 + col
    },
    [width, height, cellSize, frameSize]
  )

  const selectedSignal = activeSignals.find((s) => s.id === selectedSignalId)

  function isBitInDrag(bitPos: number) {
    if (!dragPreview) return false
    return bitPos >= dragPreview.startBit && bitPos < dragPreview.startBit + dragPreview.bitLength
  }

  function isBitInSignal(bitPos: number) {
    if (selectedSignal) {
      return bitPos >= selectedSignal.startBit && bitPos < selectedSignal.startBit + selectedSignal.bitLength
    }
    return false
  }

  function getSignalAtBit(bitPos: number) {
    return activeSignals.find((s) => bitPos >= s.startBit && bitPos < s.startBit + s.bitLength)
  }

  return (
    <div className="flex flex-col items-center select-none">
      {/* Bit column headers */}
      <div className="flex mb-1" style={{ paddingLeft: 40 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="text-xs text-gray-400 text-center font-mono" style={{ width: cellSize }}>
            {7 - i}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Byte row labels */}
        <div className="flex flex-col">
          {Array.from({ length: frameSize }, (_, byteIdx) => (
            <div
              key={byteIdx}
              className="text-xs text-gray-400 text-right pr-2 flex items-center justify-end font-mono"
              style={{ height: cellSize, width: 36 }}
            >
              {byteIdx}
            </div>
          ))}
        </div>

        {/* Main SVG canvas */}
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded cursor-crosshair"
          style={{ minWidth: width }}
          onMouseDown={(e) => {
            e.preventDefault()
            const bit = getBitIndex(e.clientX, e.clientY)
            if (bit !== null) handleMouseDown(bit)
          }}
          onMouseMove={(e) => {
            const bit = getBitIndex(e.clientX, e.clientY)
            setHoveredBit(bit)
            if (bit !== null) {
              const preview = handleMouseMove(bit)
              setDragPreview(preview)
            }
          }}
          onMouseUp={() => {
            handleMouseUp()
            setDragPreview(null)
          }}
          onMouseLeave={() => {
            setHoveredBit(null)
            setDragPreview(null)
            handleMouseUp()
          }}
        >
          {/* Grid cells */}
          {Array.from({ length: frameSize }, (_, byteIdx) =>
            Array.from({ length: 8 }, (_, bitIdx) => {
              const bitPos = byteIdx * 8 + bitIdx
              const signal = getSignalAtBit(bitPos)
              const inDrag = isBitInDrag(bitPos)
              const inSelected = isBitInSignal(bitPos)
              const isHovered = bitPos === hoveredBit

              let fill = '#ffffff'
              if (signal) fill = signal.color + '25'
              if (inSelected) fill = (selectedSignal?.color ?? '#3B82F6') + '45'
              if (inDrag) fill = '#3B82F650'
              if (isHovered && !inDrag && !signal) fill = '#f3f4f6'

              return (
                <rect
                  key={bitPos}
                  x={bitIdx * cellSize}
                  y={byteIdx * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke="#d1d5db"
                  strokeWidth={0.5}
                />
              )
            })
          )}

          {/* Signal overlays */}
          <SignalOverlay
            signals={activeSignals}
            cellSize={cellSize}
            selectedSignalId={selectedSignalId}
          />

          {/* Drag preview border */}
          {dragPreview && (() => {
            const rects: { x: number; y: number; w: number; h: number }[] = []
            for (let b = dragPreview.startBit; b < dragPreview.startBit + dragPreview.bitLength; b++) {
              const col = b % 8
              const row = Math.floor(b / 8)
              if (row < frameSize) {
                rects.push({ x: col * cellSize, y: row * cellSize, w: cellSize, h: cellSize })
              }
            }
            return rects.map((r, i) => (
              <rect key={`drag-${i}`} {...r} fill="none" stroke="#3B82F6" strokeWidth={2} rx={1} />
            ))
          })()}

          {/* Bit position numbers on hover */}
          {hoveredBit !== null && !dragPreview && (
            <text
              x={(hoveredBit % 8) * cellSize + cellSize / 2}
              y={Math.floor(hoveredBit / 8) * cellSize + cellSize / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fill="#9ca3af"
              style={{ pointerEvents: 'none' }}
            >
              {hoveredBit}
            </text>
          )}
        </svg>
      </div>

      {/* Status bar */}
      <div className="text-xs text-gray-400 mt-2 h-5">
        {dragPreview
          ? `Selected: bit ${dragPreview.startBit} - ${dragPreview.startBit + dragPreview.bitLength - 1} (${dragPreview.bitLength} bits) — release to define signal`
          : hoveredBit !== null
            ? `Byte ${Math.floor(hoveredBit / 8)}, Bit ${7 - (hoveredBit % 8)} (abs: ${hoveredBit})`
            : 'Click and drag to select a bit region for a new signal'
        }
      </div>
    </div>
  )
}
