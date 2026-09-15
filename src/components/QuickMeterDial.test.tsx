import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { QuickMeterDial } from './QuickMeterDial'

afterEach(cleanup)
function TestDial() {
  const [current, setCurrent] = useState<number | ''>('')
  return <QuickMeterDial id="test" previous={1250} current={current} onChange={setCurrent} rate={9} />
}
describe('meter interaction', () => {
  it('updates reading, units and rupees from the slider', () => {
    render(<TestDial />)
    expect(screen.getByTestId('test-amount')).toHaveTextContent('—')
    fireEvent.change(screen.getByTestId('test-slider'), { target: { value: '1392' } })
    expect(screen.getByTestId('test-current')).toHaveValue(1392)
    expect(screen.getByTestId('test-units')).toHaveTextContent('142')
    expect(screen.getByTestId('test-amount')).toHaveTextContent('₹1,278.00')
    fireEvent.click(screen.getByTestId('test-increase'))
    expect(screen.getByTestId('test-current')).toHaveValue(1393)
  })
  it('keeps exact typing and visibly rejects invalid readings', () => {
    render(<TestDial />)
    fireEvent.change(screen.getByTestId('test-current'), { target: { value: '1240' } })
    expect(screen.getByTestId('test-current')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('test-amount')).toHaveTextContent('—')
    fireEvent.change(screen.getByTestId('test-current'), { target: { value: '1392.5' } })
    expect(screen.getByTestId('test-amount')).toHaveTextContent('₹1,282.50')
  })
})