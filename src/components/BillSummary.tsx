import type { Bill } from '../types/database'
import { formatINR } from '../utils/money'
import { StatusBadge } from './StatusBadge'

export function BillSummary({ bill }: { bill: Bill }) {
  const rows: [string, number][] = [
    ['Rent', bill.rent_amount],
    ['Electricity', bill.electricity_charge],
    ['Other charges', bill.other_charges],
    ['Late fee', bill.late_fee],
    ['Previous balance', bill.previous_balance],
    ['Previous credit', -bill.previous_credit],
  ]
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-slate-900">
          {new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <StatusBadge status={bill.status} />
      </div>
      <div className="mt-4 space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-slate-600">
            <span>{label}</span>
            <span>{formatINR(value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-slate-200 pt-3 space-y-1">
        <div className="flex justify-between font-semibold text-slate-900">
          <span>Total due</span>
          <span>{formatINR(bill.total_due)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Total paid</span>
          <span>{formatINR(bill.total_paid)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>{bill.balance >= 0 ? 'Balance due' : 'Credit'}</span>
          <span className={bill.balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatINR(Math.abs(bill.balance))}</span>
        </div>
      </div>
    </div>
  )
}
