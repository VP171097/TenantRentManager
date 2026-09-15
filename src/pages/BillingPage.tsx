import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listProperties } from '../services/properties'
import { generateBillsForProperty, getBillingPreview, type BillGenerationInput } from '../services/billing'
import { ErrorState } from '../components/States'
import { Skeleton } from '../components/Skeleton'
import { friendlyError } from '../utils/errors'

export function BillingPage() {
  const queryClient = useQueryClient()
  const [propertyId, setPropertyId] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [inputs, setInputs] = useState<Record<string, { current: number | ''; skip: boolean }>>({})

  const { data: properties, isLoading, error: loadError, refetch } = useQuery({ queryKey: ['properties'], queryFn: listProperties })
  
  const { data: previewItems } = useQuery({
    queryKey: ['billingPreview', propertyId, month],
    queryFn: () => getBillingPreview(propertyId, `${month}-01`),
    enabled: !!propertyId && !!month,
  })

  const mutation = useMutation({
    mutationFn: (data: BillGenerationInput[]) => generateBillsForProperty(propertyId, `${month}-01`, data),
    onSuccess: (bills) => {
      setResult(`Generated/confirmed ${bills.length} bill(s) for ${month}.`)
      setError(null)
      setInputs({})
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['billingPreview'] })
    },
    onError: (err) => {
      setError(friendlyError(err))
      setResult(null)
    },
  })

  const isValid = useMemo(() => {
    if (!previewItems || previewItems.length === 0) return false
    for (const item of previewItems) {
      const val = inputs[item.tenant_id]
      if (!val) return false // Nothing entered yet
      if (!val.skip) {
        if (val.current === '' || val.current < item.last_reading) return false
      }
    }
    return true
  }, [previewItems, inputs])

  const handleGenerate = () => {
    if (!previewItems) return
    const data: BillGenerationInput[] = previewItems.map((item) => {
      const val = inputs[item.tenant_id]!
      return {
        tenant_id: item.tenant_id,
        room_id: item.room_id,
        last_reading: item.last_reading,
        current_reading: val.skip ? item.last_reading : Number(val.current),
        rate_per_unit: item.rate_per_unit,
        skip_electricity: val.skip,
      }
    })
    mutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="card max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }
  if (loadError) return <ErrorState message="Could not load properties." onRetry={() => refetch()} />

  return (
    <div className="space-y-6 page-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Generate Monthly Bills</h1>
      <p className="text-slate-500 dark:text-slate-400">
        This creates a bill for every active tenant in the selected property for the chosen month. It's safe to click
        more than once — bills already generated for that month won't be duplicated.
      </p>

      <div className="card max-w-md space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Property</label>
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
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Billing month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input mt-1" />
        </div>
        {result && <p className="rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">{result}</p>}
        {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>

      {previewItems && previewItems.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Tenant</th>
                <th className="px-4 py-3 font-semibold">Room</th>
                <th className="px-4 py-3 font-semibold">Previous Unit</th>
                <th className="px-4 py-3 font-semibold">Current Unit</th>
                <th className="px-4 py-3 font-semibold text-center">Skip / Carry Forward</th>
              </tr>
            </thead>
            <tbody>
              {previewItems.map((item) => {
                const val = inputs[item.tenant_id] || { current: '', skip: false }
                const isError = !val.skip && val.current !== '' && val.current < item.last_reading
                return (
                  <tr key={item.tenant_id} className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.full_name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.room_number}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.last_reading}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className={`input py-1 px-2 h-8 w-24 ${isError ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}
                        value={val.current}
                        disabled={val.skip}
                        onChange={(e) => setInputs({ ...inputs, [item.tenant_id]: { ...val, current: e.target.value === '' ? '' : Number(e.target.value) } })}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={val.skip}
                        onChange={(e) => setInputs({ ...inputs, [item.tenant_id]: { ...val, skip: e.target.checked } })}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!isValid || mutation.isPending}
              className="btn-primary w-full sm:w-auto"
            >
              {mutation.isPending ? 'Generating…' : `Generate ${previewItems.length} Bill(s)`}
            </button>
          </div>
        </div>
      )}
      {previewItems && previewItems.length === 0 && (
        <div className="card text-center text-slate-500 dark:text-slate-400 py-8">
          No active tenants found for this property.
        </div>
      )}
    </div>
  )
}
