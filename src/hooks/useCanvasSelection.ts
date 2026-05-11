import { useRef, useCallback } from 'react'

interface UseCanvasSelectionOptions {
  frameSize: number
  cellSize: number
  onComplete: (startBit: number, bitLength: number) => void
}

export function useCanvasSelection({ onComplete }: UseCanvasSelectionOptions) {
  const startRef = useRef<number | null>(null)
  const endRef = useRef<number | null>(null)
  const selectingRef = useRef(false)

  const handleMouseDown = useCallback((bit: number) => {
    startRef.current = bit
    endRef.current = bit
    selectingRef.current = true
  }, [])

  const handleMouseMove = useCallback((bit: number) => {
    if (!selectingRef.current) return null
    endRef.current = bit
    if (startRef.current === null) return null
    const min = Math.min(startRef.current, endRef.current)
    const max = Math.max(startRef.current, endRef.current)
    return { startBit: min, bitLength: max - min + 1 }
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!selectingRef.current || startRef.current === null || endRef.current === null) {
      selectingRef.current = false
      return
    }
    const min = Math.min(startRef.current, endRef.current)
    const max = Math.max(startRef.current, endRef.current)
    const bitLength = max - min + 1
    onComplete(min, bitLength)
    startRef.current = null
    endRef.current = null
    selectingRef.current = false
  }, [onComplete])

  const isActive = () => selectingRef.current

  return { handleMouseDown, handleMouseMove, handleMouseUp, isActive }
}
