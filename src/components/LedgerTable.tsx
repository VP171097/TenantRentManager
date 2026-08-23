import type { Bill } from '../types/database'
import { formatINR } from '../utils/money'
import { StatusBadge } from './StatusBadge'

export function LedgerTable({
  bills,
  onEdit,
  onDelete,
}: {
  bills: Bill[]
  onEdit?: (bill: Bill) => void
  onDelete?: (bill: Bill) => void
}) {
  const showActions = !!onEdit || !!onDelete
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3">Rent</th>
            <th className="px-4 py-3">Electricity</th>
            <th className="px-4 py-3">Total Due</th>
            <th className="px-4 py-3">Paid</th>
            <th className="px-4 py-3">Balance</th>
            <th className="px-4 py-3">Status</th>
            {showActions && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-900">
                {new Date(b.billing_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">{formatINR(b.rent_amount)}</td>
              <td className="px-4 py-3">{formatINR(b.electricity_charge)}</td>
              <td className="px-4 py-3">{formatINR(b.total_due)}</td>
              <td className="px-4 py-3">{formatINR(b.total_paid)}</td>
              <td className={`px-4 py-3 font-semibold ${b.balance > 0 ? 'text-red-600' : b.balance < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                {formatINR(b.balance)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={b.status} />
              </td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button onClick={() => onEdit(b)} className="font-semibold text-brand-700 hover:underline">
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(b)} className="font-semibold text-red-600 hover:underline">
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
