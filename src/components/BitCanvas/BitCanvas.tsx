import { useRef, useState, useCallback } from 'react'
import { useMessageStore } from '../../stores/messageStore'
import { useCanvasSelection } from '../../hooks/useCanvasSelection'
import { SignalOverlay } from './SignalOverlay'
import { DEFAULT_CELL_SIZE } from '@shared/constants'
import type { BitNumbering } from '@shared/types'

interface BitCanvasProps {
  onBitSelection: (startBit: number, bitLength: number) => void
}

function getBitLabel(_byteIndex: number, bitInByte: number, numbering: BitNumbering): string {
  if (numbering === 'msb0') {
    return String(7 - bitInByte)
  }
  return String(bitInByte)
}

export function BitCanvas({ onBitSelection }: BitCanvasProps) {
  const { activeMessage, activeSignals, selectedSignalId, bitNumbering, setBitNumbering } = useMessageStore()
  const message = activeMessage
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
      {/* Controls */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-400">Bit numbering:</span>
          <button
            className={`px-1.5 py-0.5 rounded text-xs font-mono ${bitNumbering === 'msb0' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setBitNumbering('msb0')}
          >
            MSB0
          </button>
          <button
            className={`px-1.5 py-0.5 rounded text-xs font-mono ${bitNumbering === 'lsb0' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setBitNumbering('lsb0')}
          >
            LSB0
          </button>
        </div>
      </div>

      {/* Bit column headers */}
      <div className="flex" style={{ paddingLeft: 24 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="text-xs text-gray-400 text-center font-mono" style={{ width: cellSize }}>
            {getBitLabel(0, i, bitNumbering)}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Byte row labels */}
        <div className="flex flex-col">
          {Array.from({ length: frameSize }, (_, byteIdx) => (
            <div
              key={byteIdx}
              className="text-xs text-gray-500 text-right pr-2 flex items-center justify-end font-mono font-semibold"
              style={{ height: cellSize, width: 20 }}
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
              fill="#6b7280"
              style={{ pointerEvents: 'none' }}
            >
              B{Math.floor(hoveredBit / 8)}:{getBitLabel(Math.floor(hoveredBit / 8), hoveredBit % 8, bitNumbering)}
            </text>
          )}
        </svg>
      </div>

      {/* Status bar */}
      <div className="text-xs text-gray-400 mt-2 h-5">
        {dragPreview
          ? `Selected: B${Math.floor(dragPreview.startBit / 8)}:${getBitLabel(Math.floor(dragPreview.startBit / 8), dragPreview.startBit % 8, bitNumbering)} — B${Math.floor((dragPreview.startBit + dragPreview.bitLength - 1) / 8)}:${getBitLabel(Math.floor((dragPreview.startBit + dragPreview.bitLength - 1) / 8), (dragPreview.startBit + dragPreview.bitLength - 1) % 8, bitNumbering)} (${dragPreview.bitLength} bits)`
          : hoveredBit !== null
            ? `Byte ${Math.floor(hoveredBit / 8)}, Bit ${getBitLabel(Math.floor(hoveredBit / 8), hoveredBit % 8, bitNumbering)} (abs: ${hoveredBit})`
            : 'Click and drag to select a bit region for a new signal'
        }
      </div>
    </div>
  )
}
