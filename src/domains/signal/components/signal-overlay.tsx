import type { Signal, SignalGroup } from '@/foundation/types'

interface SignalOverlayProps {
  signals: Signal[]
  groups: SignalGroup[]
  cellSize: number
  selectedSignalId: string | null
}

const SIGNAL_PATTERNS = [
  'none',
  'url(#hatch-0)',
  'url(#dots-0)',
  'url(#hatch-1)',
  'url(#cross-0)',
  'url(#dots-1)',
]

export function SignalOverlay({ signals, groups, cellSize, selectedSignalId }: SignalOverlayProps) {
  return (
    <g className="pointer-events-none">
      <defs>
        <pattern id="hatch-0" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
        </pattern>
        <pattern id="hatch-1" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
        </pattern>
        <pattern id="dots-0" patternUnits="userSpaceOnUse" width="8" height="8">
          <circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.1)" />
        </pattern>
        <pattern id="dots-1" patternUnits="userSpaceOnUse" width="8" height="8">
          <circle cx="4" cy="4" r="1.5" fill="rgba(0,0,0,0.1)" />
        </pattern>
        <pattern id="cross-0" patternUnits="userSpaceOnUse" width="8" height="8">
          <line x1="0" y1="4" x2="8" y2="4" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
          <line x1="4" y1="0" x2="4" y2="8" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        </pattern>
      </defs>

      {signals.map((signal, signalIdx) => {
        const cells: { row: number; col: number; cycle: number }[] = []

        let cycleCount = 1
        let cycleStride = 0
        if (signal.groupId) {
          const group = groups.find(g => g.id === signal.groupId)
          if (group && group.repeatCount && group.repeatCount > 1) {
            cycleCount = group.repeatCount
            cycleStride = group.bitWidth
          }
        }

        for (let cycle = 0; cycle < cycleCount; cycle++) {
          const offset = cycle * cycleStride
          for (let bit = signal.startBit + offset; bit < signal.startBit + signal.bitLength + offset; bit++) {
            cells.push({ row: Math.floor(bit / 8), col: bit % 8, cycle })
          }
        }

        const isSelected = signal.id === selectedSignalId
        const patternUrl = SIGNAL_PATTERNS[signalIdx % SIGNAL_PATTERNS.length]

        return (
          <g key={signal.id}>
            {cells.map((cell) => (
              <rect
                key={`fill-${cell.cycle}-${cell.row}-${cell.col}`}
                x={cell.col * cellSize + 1}
                y={cell.row * cellSize + 1}
                width={cellSize - 2}
                height={cellSize - 2}
                fill={signal.color + (isSelected ? '50' : '30')}
                stroke={signal.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                rx={2}
              />
            ))}
            {patternUrl !== 'none' && cells.map((cell) => (
              <rect
                key={`pattern-${cell.cycle}-${cell.row}-${cell.col}`}
                x={cell.col * cellSize + 1}
                y={cell.row * cellSize + 1}
                width={cellSize - 2}
                height={cellSize - 2}
                fill={patternUrl}
                stroke="none"
                rx={2}
              />
            ))}
          </g>
        )
      })}

      {signals.map((signal) => {
        if (signal.bitLength < 4) return null

        let cycleCount = 1
        let cycleStride = 0
        if (signal.groupId) {
          const group = groups.find(g => g.id === signal.groupId)
          if (group && group.repeatCount && group.repeatCount > 1) {
            cycleCount = group.repeatCount
            cycleStride = group.bitWidth
          }
        }

        const labels: { x: number; y: number; cycle: number }[] = []
        for (let cycle = 0; cycle < cycleCount; cycle++) {
          const offset = cycle * cycleStride
          const startBit = signal.startBit + offset
          const row = Math.floor(startBit / 8)
          const col = startBit % 8
          labels.push({
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + 10,
            cycle,
          })
        }

        return labels.map((label) => (
          <text
            key={`label-${signal.id}-cycle-${label.cycle}`}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="hanging"
            className="text-[11px] font-semibold pointer-events-none"
            fill={signal.color}
          >
            {signal.name.length > 12 ? signal.name.slice(0, 11) + '…' : signal.name}
          </text>
        ))
      })}
    </g>
  )
}
