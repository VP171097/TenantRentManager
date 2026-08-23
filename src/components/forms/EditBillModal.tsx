import { useState } from 'react'
import { Field } from './PropertyForm'
import { formatINR } from '../../utils/money'
import type { Bill, ElectricityReading } from '../../types/database'

export interface EditBillValues {
  rent_amount: number
  previous_reading: number
  current_reading: number
  rate_per_unit: number
  is_meter_reset: boolean
  other_charges: number
  late_fee: number
  notes: string
}

export function EditBillModal({
  open,
  bill,
  reading,
  onClose,
  onSubmit,
}: {
  open: boolean
  bill: Bill | null
  reading: ElectricityReading | null
  onClose: () => void
  onSubmit: (values: EditBillValues) => Promise<unknown>
}) {
  if (!open || !bill) return null
  // Keyed on bill.id so switching bills re-initializes local form state
  // instead of needing an effect to sync it.
  return <EditBillModalContent key={bill.id} bill={bill} reading={reading} onClose={onClose} onSubmit={onSubmit} />
}

function EditBillModalContent({
  bill,
  reading,
  onClose,
  onSubmit,
}: {
  bill: Bill
  reading: ElectricityReading | null
  onClose: () => void
  onSubmit: (values: EditBillValues) => Promise<unknown>
}) {
  const [rentAmount, setRentAmount] = useState(bill.rent_amount)
  const [previousReading, setPreviousReading] = useState(reading?.previous_reading ?? 0)
  const [currentReading, setCurrentReading] = useState(reading?.current_reading ?? bill.electricity_units)
  const [ratePerUnit, setRatePerUnit] = useState(
    reading?.rate_per_unit ?? (bill.electricity_units > 0 ? bill.electricity_charge / bill.electricity_units : 0)
  )
  const [isMeterReset, setIsMeterReset] = useState(reading?.is_meter_reset ?? false)
  const [otherCharges, setOtherCharges] = useState(bill.other_charges)
  const [lateFee, setLateFee] = useState(bill.late_fee)
  const [notes, setNotes] = useState(bill.notes ?? '')
  const [submitting, setSubmitting] = useState(false)

  const units = isMeterReset ? Math.max(currentReading, 0) : Math.max(currentReading - previousReading, 0)
  const electricityCharge = units * ratePerUnit
  const estimatedTotal = rentAmount + electricityCharge + otherCharges + lateFee + bill.previous_balance - bill.previous_credit

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Edit Bill</h2>
        <p className="mt-1 text-sm text-slate-500">
          {new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}. Use this to
          correct mistakes on this month's bill — the billing month itself, and the previous balance/credit carried
          in from last month, cannot be changed here.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitting(true)
            try {
              await onSubmit({
                rent_amount: rentAmount,
                previous_reading: previousReading,
                current_reading: currentReading,
                rate_per_unit: ratePerUnit,
                is_meter_reset: isMeterReset,
                other_charges: otherCharges,
                late_fee: lateFee,
                notes,
              })
            } finally {
              setSubmitting(false)
            }
          }}
          className="mt-4 space-y-4"
        >
          <Field label="Rent amount (₹) — manual correction for this bill only">
            <input type="number" step="0.01" min="0" value={rentAmount} onChange={(e) => setRentAmount(Number(e.target.value))} className="input" />
          </Field>
          <p className="text-xs text-slate-500">
            To change rent going forward, use "Revise Rent" instead — this field only corrects this one bill.
          </p>

          <Field label="Previous meter reading">
            <input type="number" step="0.01" min="0" value={previousReading} onChange={(e) => setPreviousReading(Number(e.target.value))} className="input" />
          </Field>
          <Field label="Current meter reading">
            <input type="number" step="0.01" min="0" value={currentReading} onChange={(e) => setCurrentReading(Number(e.target.value))} className="input" />
          </Field>
          <Field label="Rate per unit (₹)">
            <input type="number" step="0.01" min="0" value={ratePerUnit} onChange={(e) => setRatePerUnit(Number(e.target.value))} className="input" />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={isMeterReset} onChange={(e) => setIsMeterReset(e.target.checked)} />
            Meter was reset / replaced
          </label>

          <Field label="Other charges (₹)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={otherCharges}
              onChange={(e) => setOtherCharges(Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Late fee (₹)">
            <input type="number" step="0.01" min="0" value={lateFee} onChange={(e) => setLateFee(Number(e.target.value))} className="input" />
          </Field>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={3} />
          </Field>

          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Units used</span>
              <span>{units}</span>
            </div>
            <div className="flex justify-between">
              <span>Electricity charge</span>
              <span>{formatINR(electricityCharge)}</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold text-slate-900">
              <span>New total due</span>
              <span>{formatINR(estimatedTotal)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
