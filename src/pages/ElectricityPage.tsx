import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listTenants } from '../services/tenants'
import { listElectricityReadings, recordElectricityReading } from '../services/electricity'
import { ElectricityForm } from '../components/forms/ElectricityForm'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { friendlyError } from '../utils/errors'
import type { ElectricityFormValues } from '../utils/validation'
import type { Tenant } from '../types/database'

export function ElectricityPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: tenants, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['tenants-active'],
    queryFn: () => listTenants(),
  })
  const { data: readings } = useQuery({ queryKey: ['electricity-readings'], queryFn: () => listElectricityReadings() })

  const mutation = useMutation({
    mutationFn: (values: ElectricityFormValues) =>
      recordElectricityReading({
        room_id: values.room_id,
        tenant_id: values.tenant_id,
        billing_month: `${values.billing_month}-01`,
        previous_reading: values.previous_reading,
        current_reading: values.current_reading,
        rate_per_unit: values.rate_per_unit,
        is_meter_reset: values.is_meter_reset,
        reset_explanation: values.reset_explanation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['electricity-readings'] })
      setError(null)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  if (isLoading) return <LoadingState />
  if (loadError) return <ErrorState message="Could not load tenants." onRetry={() => refetch()} />

  const activeTenants = (tenants ?? []).filter((t) => t.status === 'active' && t.room_id) as (Tenant & { room_id: string })[]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Electricity Readings</h1>

      <div className="card max-w-md">
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <ElectricityForm tenants={activeTenants} onSubmit={(v) => mutation.mutateAsync(v)} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Recent readings</h2>
        {readings && readings.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Previous</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Rate</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{new Date(r.billing_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3">{r.previous_reading}</td>
                    <td className="px-4 py-3">{r.current_reading}</td>
                    <td className="px-4 py-3">{Math.max(r.current_reading - r.previous_reading, 0)}</td>
                    <td className="px-4 py-3">₹{r.rate_per_unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No readings recorded yet" />
        )}
      </section>
    </div>
  )
}
