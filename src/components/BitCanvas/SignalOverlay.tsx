import type { Signal } from '@shared/types'

interface SignalOverlayProps {
  signals: Signal[]
  cellSize: number
  selectedSignalId: string | null
}

export function SignalOverlay({ signals, cellSize, selectedSignalId }: SignalOverlayProps) {
  return (
    <g className="pointer-events-none">
      {signals.map((signal) => {
        const cells: { row: number; col: number }[] = []
        for (let bit = signal.startBit; bit < signal.startBit + signal.bitLength; bit++) {
          cells.push({ row: Math.floor(bit / 8), col: bit % 8 })
        }

        const isSelected = signal.id === selectedSignalId
        const strokeColor = signal.color
        const fillColor = signal.color + (isSelected ? '40' : '20')

        return cells.map((cell) => (
          <rect
            key={`${signal.id}-${cell.row}-${cell.col}`}
            x={cell.col * cellSize + 1}
            y={cell.row * cellSize + 1}
            width={cellSize - 2}
            height={cellSize - 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={isSelected ? 2 : 1}
            rx={2}
          />
        ))
      })}

      {signals.map((signal) => {
        const firstBit = signal.startBit
        const row = Math.floor(firstBit / 8)
        const col = firstBit % 8
        const textX = col * cellSize + cellSize / 2
        const textY = row * cellSize + 8

        if (signal.bitLength < 4) return null

        return (
          <text
            key={`label-${signal.id}`}
            x={textX}
            y={textY}
            textAnchor="middle"
            dominantBaseline="hanging"
            className="text-[9px] font-medium pointer-events-none"
            fill={signal.color}
          >
            {signal.name.length > 8 ? signal.name.slice(0, 7) + '…' : signal.name}
          </text>
        )
      })}
    </g>
  )
}
