import { useState } from 'react'
import { Field } from './PropertyForm'
import { formatINR } from '../../utils/money'
import type { Bill } from '../../types/database'

export function EditBillModal({
  open,
  bill,
  onClose,
  onSubmit,
}: {
  open: boolean
  bill: Bill | null
  onClose: () => void
  onSubmit: (values: { other_charges: number; late_fee: number; notes: string }) => Promise<unknown>
}) {
  if (!open || !bill) return null
  // Keyed on bill.id so switching bills re-initializes local form state
  // instead of needing an effect to sync it.
  return <EditBillModalContent key={bill.id} bill={bill} onClose={onClose} onSubmit={onSubmit} />
}

function EditBillModalContent({
  bill,
  onClose,
  onSubmit,
}: {
  bill: Bill
  onClose: () => void
  onSubmit: (values: { other_charges: number; late_fee: number; notes: string }) => Promise<unknown>
}) {
  const [otherCharges, setOtherCharges] = useState(bill.other_charges)
  const [lateFee, setLateFee] = useState(bill.late_fee)
  const [notes, setNotes] = useState(bill.notes ?? '')
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Edit Bill</h2>
        <p className="mt-1 text-sm text-slate-500">
          {new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · Rent{' '}
          {formatINR(bill.rent_amount)} and electricity {formatINR(bill.electricity_charge)} are fixed for this bill and
          cannot be changed here.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitting(true)
            try {
              await onSubmit({ other_charges: otherCharges, late_fee: lateFee, notes })
            } finally {
              setSubmitting(false)
            }
          }}
          className="mt-4 space-y-4"
        >
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
