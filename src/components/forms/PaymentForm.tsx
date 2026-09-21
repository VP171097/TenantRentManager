import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormValues } from '../../utils/validation'
import { resolveUpiForTenant } from '../../services/upi'
import { Field } from './PropertyForm'
import type { Bill } from '../../types/database'
import { formatINR } from '../../utils/money'

export function PaymentForm({
  bills,
  defaultBillId,
  onSubmit,
}: {
  bills: Bill[]
  defaultBillId?: string
  onSubmit: (values: PaymentFormValues) => Promise<unknown>
}) {
  const defaultBill = bills.find((b) => b.id === defaultBillId)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      bill_id: defaultBillId,
      amount: defaultBill?.balance,
      payment_date: new Date().toISOString().slice(0, 10),
      method: defaultBill?.tenant_marked_paid_method ?? 'cash',
    },
  })

  const selectedBillId = watch('bill_id')
  const selectedBill = bills.find((b) => b.id === selectedBillId)
  const [upiId, setUpiId] = useState<string | null>(null)

  // Autofill amount/method from the selected bill — the owner can still
  // freely edit either afterward (e.g. a part payment was actually made).
  useEffect(() => {
    if (!selectedBill) return
    setValue('amount', selectedBill.balance)
    if (selectedBill.tenant_marked_paid_method) {
      setValue('method', selectedBill.tenant_marked_paid_method)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBillId])

  const selectedTenantId = selectedBill?.tenant_id
  useEffect(() => {
    if (!selectedTenantId) {
      setUpiId(null)
      return
    }
    let cancelled = false
    resolveUpiForTenant(selectedTenantId)
      .then((id) => {
        if (!cancelled) setUpiId(id)
      })
      .catch(() => {
        if (!cancelled) setUpiId(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedTenantId])

  const method = watch('method')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Bill" error={errors.bill_id?.message}>
        <select {...register('bill_id')} className="input">
          <option value="">Select a bill</option>
          {bills.map((b) => (
            <option key={b.id} value={b.id}>
              {new Date(b.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} — balance{' '}
              {formatINR(b.balance)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount (₹)" error={errors.amount?.message}>
        <input type="number" step="0.01" min="0.01" {...register('amount')} className="input" />
      </Field>
      {selectedBill?.tenant_marked_paid_method && (
        <p className="-mt-2 text-xs text-amber-700 dark:text-amber-400">
          Tenant said they paid via {selectedBill.tenant_marked_paid_method.replace('_', ' ')} — method below is
          prefilled to match.
        </p>
      )}
      <Field label="Payment date" error={errors.payment_date?.message}>
        <input type="date" {...register('payment_date')} className="input" />
      </Field>
      <Field label="Method" error={errors.method?.message}>
        <select {...register('method')} className="input">
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </Field>
      {method === 'upi' && (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          {upiId ? (
            <>
              Paid to: <span className="font-semibold text-slate-700 dark:text-slate-300">{upiId}</span>
            </>
          ) : selectedBill ? (
            'No UPI ID is configured for this room/owner yet.'
          ) : (
            'Select a bill to see which UPI ID this room pays to.'
          )}
        </p>
      )}
      <Field label="Reference (optional)" error={errors.reference?.message}>
        <input {...register('reference')} className="input" />
      </Field>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Recording…' : 'Record Payment'}
      </button>
    </form>
  )
}
