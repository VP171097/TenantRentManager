import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listProperties } from '../services/properties'
import { generateBillsForProperty } from '../services/billing'
import { LoadingState, ErrorState } from '../components/States'
import { friendlyError } from '../utils/errors'

export function BillingPage() {
  const queryClient = useQueryClient()
  const [propertyId, setPropertyId] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: properties, isLoading, error: loadError, refetch } = useQuery({ queryKey: ['properties'], queryFn: listProperties })

  const mutation = useMutation({
    mutationFn: () => generateBillsForProperty(propertyId, `${month}-01`),
    onSuccess: (bills) => {
      setResult(`Generated/confirmed ${bills.length} bill(s) for ${month}.`)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
    onError: (err) => {
      setError(friendlyError(err))
      setResult(null)
    },
  })

  if (isLoading) return <LoadingState />
  if (loadError) return <ErrorState message="Could not load properties." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Generate Monthly Bills</h1>
      <p className="text-slate-500">
        This creates a bill for every active tenant in the selected property for the chosen month. It's safe to click
        more than once — bills already generated for that month won't be duplicated.
      </p>

      <div className="card max-w-md space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Property</label>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="input mt-1">
            <option value="">Select a property</option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Billing month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input mt-1" />
        </div>
        {result && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{result}</p>}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          onClick={() => mutation.mutate()}
          disabled={!propertyId || mutation.isPending}
          className="btn-primary w-full"
        >
          {mutation.isPending ? 'Generating…' : 'Generate Bills'}
        </button>
      </div>
    </div>
  )
}
