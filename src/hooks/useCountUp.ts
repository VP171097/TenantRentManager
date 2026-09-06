import { useEffect, useRef, useState } from 'react'

/** Animates a number from 0 up to `value` on first render (and whenever
 * `value` changes), for the dashboard's stat cards. Respects
 * prefers-reduced-motion by jumping straight to the final value. */
export function useCountUp(value: number, durationMs = 700): number {
  const [display, setDisplay] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? value : 0
  )
  const frame = useRef<number>(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const from = 0
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / durationMs)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (value - from) * eased)
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
      }
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs])

  return display
}
