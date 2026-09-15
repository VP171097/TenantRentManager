import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listProperties } from '../services/properties'
import { generateBillsForProperty, getBillingPreview, type BillGenerationInput } from '../services/billing'
import { ErrorState } from '../components/States'
import { Skeleton } from '../components/Skeleton'
import { friendlyError } from '../utils/errors'
import { QuickMeterDial } from '../components/QuickMeterDial'
import { useSearchParams } from 'react-router-dom'
import { currentBillingMonth } from '../utils/dashboard'

export function BillingPage() {
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [propertyId, setPropertyId] = useState(params.get('property') ?? '')
  const [month, setMonth] = useState(currentBillingMonth())
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [inputs, setInputs] = useState<Record<string, { current: number | ''; skip: boolean }>>({})

  const { data: properties, isLoading, error: loadError, refetch } = useQuery({ queryKey: ['properties'], queryFn: listProperties })
  
  const { data: previewItems, isFetching: previewLoading, error: previewError, refetch: refetchPreview } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] })
      queryClient.invalidateQueries({ queryKey: ['electricityReadings'] })
    },
    onError: (err) => {
      setError(friendlyError(err))
      setResult(null)
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['billingPreview'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const isValid = useMemo(() => {
    if (!previewItems || previewItems.length === 0) return false
    for (const item of previewItems) {
      const val = inputs[item.tenant_id]
      if (!val) return false // Nothing entered yet
      // The real meter reading is always required now (migration 032 —
      // it's recorded even when "Skip / Carry Forward" defers the
      // charge), so this check no longer relaxes when val.skip is true.
      if (val.current === '' || !Number.isFinite(val.current) || val.current < item.last_reading) return false
    }
    return true
  }, [previewItems, inputs])

  const handleGenerate = () => {
    if (!previewItems || !isValid || mutation.isPending || previewLoading) return
    const data: BillGenerationInput[] = previewItems.map((item) => {
      const val = inputs[item.tenant_id]!
      return {
        tenant_id: item.tenant_id,
        room_id: item.room_id,
        last_reading: item.last_reading,
        current_reading: Number(val.current),
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
      <h1 data-testid="billing-title" className="text-3xl font-medium text-slate-900 dark:text-slate-100">A clearer month, one reading at a time.</h1>
      <p data-testid="billing-description" className="text-slate-600 dark:text-slate-300">
        This creates a bill for every active tenant in the selected property for the chosen month. It's safe to click
        more than once — bills already generated for that month won't be duplicated.
      </p>

      <div className="card max-w-md space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Property</label>
          <select data-testid="billing-property" aria-label="Property" disabled={mutation.isPending} value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setInputs({}); setResult(null); setError(null) }} className="input mt-1">
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
          <input data-testid="billing-month" aria-label="Billing month" type="month" disabled={mutation.isPending} value={month} onChange={(e) => { setMonth(e.target.value); setInputs({}); setResult(null); setError(null) }} className="input mt-1" />
        </div>
        {result && <p data-testid="billing-success" role="status" className="rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">{result}</p>}
        {error && <p data-testid="billing-error" role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>

      {previewLoading && <p data-testid="billing-preview-loading" role="status" className="text-sm text-slate-600 dark:text-slate-300">Loading saved readings…</p>}
      {previewError && <ErrorState message="Couldn't load saved meter readings. Nothing has been changed." onRetry={() => refetchPreview()} />}
      {!previewLoading && !previewError && previewItems && previewItems.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">{previewItems.map(item => {
            const val = inputs[item.tenant_id] ?? { current: '' as const, skip: false }
            return <article data-testid={`billing-tenant-${item.tenant_id}`} key={item.tenant_id} className="card !p-5">
              <div className="mb-4 flex justify-between gap-3"><h2 data-testid={`billing-tenant-name-${item.tenant_id}`} className="text-lg">{item.full_name}</h2><span data-testid={`billing-room-${item.tenant_id}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">Room {item.room_number}</span></div>
              <QuickMeterDial id={`billing-meter-${item.tenant_id}`} previous={item.last_reading} current={val.current} rate={item.rate_per_unit} deferred={val.skip} disabled={mutation.isPending} onChange={current => setInputs(prev => ({ ...prev, [item.tenant_id]: { ...val, current } }))} />
              <label data-testid={`billing-defer-label-${item.tenant_id}`} className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input data-testid={`billing-defer-${item.tenant_id}`} type="checkbox" disabled={mutation.isPending} checked={val.skip} onChange={e => setInputs(prev => ({ ...prev, [item.tenant_id]: { ...val, skip: e.target.checked } }))} />Record reading, carry charge to next bill</label>
            </article>
          })}</div>
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <p data-testid="billing-save-note" className="max-w-lg text-xs leading-relaxed text-slate-600 dark:text-slate-300">Readings are not saved until you generate bills. Previously generated bills are kept unchanged. Review the exact meter numbers before continuing.</p>
            <button
              data-testid="billing-generate"
              onClick={handleGenerate}
              disabled={!isValid || mutation.isPending || previewLoading}
              className="btn-primary w-full sm:w-auto"
            >
              {mutation.isPending ? 'Generating…' : `Generate ${previewItems.length} Bill(s)`}
            </button>
          </div>
        </div>
      )}
      {previewItems && previewItems.length === 0 && (
        <div data-testid="billing-empty" className="card text-center text-slate-500 dark:text-slate-400 py-8">
          No active tenants found for this property.
        </div>
      )}
    </div>
  )
}
