import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormValues } from '../../utils/validation'
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      bill_id: defaultBillId,
      payment_date: new Date().toISOString().slice(0, 10),
      method: 'cash',
    },
  })

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
      <Field label="Reference (optional)" error={errors.reference?.message}>
        <input {...register('reference')} className="input" />
      </Field>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Recording…' : 'Record Payment'}
      </button>
    </form>
  )
}
