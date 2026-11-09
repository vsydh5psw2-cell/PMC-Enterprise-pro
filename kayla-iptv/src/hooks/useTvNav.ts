import { useCallback, useEffect, useState } from 'react'

type Options = {
  columns: number
  itemCount: number
  enabled?: boolean
  onSelect: (index: number) => void
  onBack?: () => void
}

/** Arrow-key / remote D-pad navigation for a TV grid. */
export function useTvNav({
  columns,
  itemCount,
  enabled = true,
  onSelect,
  onBack,
}: Options) {
  const [focusIndex, setFocusIndex] = useState(0)
  const safeIndex =
    itemCount === 0 ? 0 : Math.min(focusIndex, itemCount - 1)

  const move = useCallback(
    (delta: number) => {
      if (itemCount === 0) return
      setFocusIndex((i) => {
        const current = Math.min(i, itemCount - 1)
        const next = current + delta
        if (next < 0) return 0
        if (next >= itemCount) return itemCount - 1
        return next
      })
    },
    [itemCount],
  )

  useEffect(() => {
    if (!enabled) return

    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          // RTL UI: right moves to previous visual index
          move(-1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          move(1)
          break
        case 'ArrowDown':
          e.preventDefault()
          move(columns)
          break
        case 'ArrowUp':
          e.preventDefault()
          move(-columns)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          onSelect(safeIndex)
          break
        case 'Backspace':
        case 'Escape':
        case 'BrowserBack':
          if (onBack) {
            e.preventDefault()
            onBack()
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [columns, enabled, move, onBack, onSelect, safeIndex])

  return { focusIndex: safeIndex, setFocusIndex }
}
