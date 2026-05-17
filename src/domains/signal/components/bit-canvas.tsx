import { useRef, useState, useCallback } from 'react'
import { useMessageStore } from '@/domains/message/hooks/use-message-store'
import { useCanvasSelection } from '@/foundation/hooks/use-canvas-selection'
import { SignalOverlay } from './signal-overlay'
import { DEFAULT_CELL_SIZE } from '@/foundation/lib/constants'
import { getBitLabel } from '@/foundation/lib/bit-position'

interface BitCanvasProps {
  onBitSelection: (startBit: number, bitLength: number) => void
  readOnly?: boolean
}

export function BitCanvas({ onBitSelection, readOnly = false }: BitCanvasProps) {
  const { activeMessage, activeSignals, selectedSignalId, bitNumbering, setBitNumbering } = useMessageStore()
  const message = activeMessage
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredBit, setHoveredBit] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
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
    return activeSignals.find((s) => {
      return bitPos >= s.startBit && bitPos < s.startBit + s.bitLength
    })
  }

  return (
    <div className="flex flex-col items-center select-none">
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

      <div className="flex" style={{ paddingLeft: 24 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="text-xs text-gray-400 text-center font-mono" style={{ width: cellSize }}>
            {getBitLabel(i, bitNumbering)}
          </div>
        ))}
      </div>

      <div className="flex">
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

        <svg
          ref={svgRef}
          width={width}
          height={height}
          className={`border border-gray-300 rounded ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
          style={{ minWidth: width }}
          onMouseDown={(e) => {
            if (readOnly) return
            e.preventDefault()
            const bit = getBitIndex(e.clientX, e.clientY)
            if (bit !== null) handleMouseDown(bit)
          }}
          onMouseMove={(e) => {
            const bit = getBitIndex(e.clientX, e.clientY)
            setHoveredBit(bit)
            const rect = svgRef.current?.getBoundingClientRect()
            if (rect) {
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }
            if (bit !== null && !readOnly) {
              const preview = handleMouseMove(bit)
              setDragPreview(preview)
            }
          }}
          onMouseUp={() => {
            if (readOnly) return
            handleMouseUp()
            setDragPreview(null)
          }}
          onMouseLeave={() => {
            if (readOnly) return
            setHoveredBit(null)
            setMousePos(null)
            setDragPreview(null)
            handleMouseUp()
          }}
        >
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

          <SignalOverlay
            signals={activeSignals}
            cellSize={cellSize}
            selectedSignalId={selectedSignalId}
          />

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

          {hoveredBit !== null && !dragPreview && (() => {
            const signal = getSignalAtBit(hoveredBit)
            if (signal && mousePos) {
              const absStart = signal.startBit
              const tipX = mousePos.x + 12
              const tipY = mousePos.y - 8
              const lines = [
                signal.name,
                `B${Math.floor(absStart / 8)}:${getBitLabel(absStart % 8, bitNumbering)} — B${Math.floor((absStart + signal.bitLength - 1) / 8)}:${getBitLabel((absStart + signal.bitLength - 1) % 8, bitNumbering)} (${signal.bitLength}b)`,
                signal.dataType ?? 'raw',
                signal.unit ? `Unit: ${signal.unit}` : null,
                signal.factor !== 1 || signal.offset !== 0 ? `Factor: ${signal.factor}, Offset: ${signal.offset}` : null,
              ].filter(Boolean) as string[]

              const lineH = 16
              const padX = 10
              const padY = 6
              const tipW = Math.max(...lines.map((l) => l.length * 7.2 + padX * 2)) + 4
              const tipH = lines.length * lineH + padY * 2
              const clampedX = Math.min(tipX, width - tipW - 4)
              const clampedY = Math.max(tipY - tipH, 4)

              return (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={clampedX}
                    y={clampedY}
                    width={tipW}
                    height={tipH}
                    rx={4}
                    fill="rgba(15,23,42,0.92)"
                    stroke={signal.color}
                    strokeWidth={1}
                  />
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={clampedX + padX}
                      y={clampedY + padY + 12 + i * lineH}
                      fontSize={11}
                      fontFamily="monospace"
                      fill={i === 0 ? signal.color : '#e2e8f0'}
                      fontWeight={i === 0 ? 'bold' : 'normal'}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            }

            if (!signal) {
              return (
                <text
                  x={(hoveredBit % 8) * cellSize + cellSize / 2}
                  y={Math.floor(hoveredBit / 8) * cellSize + cellSize / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fill="#9ca3af"
                  style={{ pointerEvents: 'none' }}
                >
                  B{Math.floor(hoveredBit / 8)}:{getBitLabel(hoveredBit % 8, bitNumbering)}
                </text>
              )
            }
            return null
          })()}
        </svg>
      </div>

      <div className="text-xs text-gray-400 mt-2 h-5">
        {readOnly ? null : dragPreview
          ? `Selected: B${Math.floor(dragPreview.startBit / 8)}:${getBitLabel(dragPreview.startBit % 8, bitNumbering)} — B${Math.floor((dragPreview.startBit + dragPreview.bitLength - 1) / 8)}:${getBitLabel((dragPreview.startBit + dragPreview.bitLength - 1) % 8, bitNumbering)} (${dragPreview.bitLength} bits)`
          : hoveredBit !== null
            ? (() => {
                const signal = getSignalAtBit(hoveredBit)
                if (signal) {
                  return `${signal.name} — ${signal.bitLength}b ${signal.dataType ?? 'raw'}${signal.unit ? ` · ${signal.unit}` : ''}`
                }
                return `Byte ${Math.floor(hoveredBit / 8)}, Bit ${getBitLabel(hoveredBit % 8, bitNumbering)} (abs: ${hoveredBit})`
              })()
            : 'Click and drag to select a bit region for a new signal'
        }
      </div>
    </div>
  )
}
