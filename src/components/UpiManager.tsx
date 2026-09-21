import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUpiIds, addUpiId, deleteUpiId } from '../services/upi'
import { friendlyError } from '../utils/errors'
import { isValidUpiId } from '../utils/upi'
import { Trash2, Plus, QrCode } from 'lucide-react'

export function UpiManager({ ownerId, onDraftChange }: { ownerId: string; onDraftChange?: (hasDraft: boolean) => void }) {
  const queryClient = useQueryClient()
  const { data: upiIds, isLoading } = useQuery({
    queryKey: ['upi-ids', ownerId],
    queryFn: () => listUpiIds(ownerId),
  })

  const [label, setLabel] = useState('')
  const [upiId, setUpiId] = useState('')
  const [error, setError] = useState<string | null>(null)

  function updateLabel(v: string) {
    setLabel(v)
    onDraftChange?.(v.trim().length > 0 || upiId.trim().length > 0)
  }
  function updateUpiId(v: string) {
    setUpiId(v)
    onDraftChange?.(label.trim().length > 0 || v.trim().length > 0)
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!label.trim()) throw new Error('Please enter a label (e.g. Building A)')
      if (!isValidUpiId(upiId)) throw new Error('Please enter a valid UPI ID')
      await addUpiId(ownerId, label, upiId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upi-ids', ownerId] })
      setLabel('')
      setUpiId('')
      setError(null)
      onDraftChange?.(false)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUpiId(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['upi-ids', ownerId] }),
  })

  function submitAdd() {
    if (!addMutation.isPending) addMutation.mutate()
  }

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4">
      <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <QrCode size={16} className="text-slate-400" />
        Additional UPI IDs (Room-Specific)
      </h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        If you want specific rooms to pay to a different bank account, add those UPI IDs here, then tap{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">+ Add</span> below — this is saved
        separately from the "Save Changes" button at the bottom of this page, which only saves your name/phone/main
        UPI ID above.
      </p>

      <div className="space-y-3 mb-4">
        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {upiIds?.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{u.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{u.upi_id}</p>
            </div>
            <button
              onClick={() => deleteMutation.mutate(u.id)}
              disabled={deleteMutation.isPending}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {upiIds?.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">No additional UPI IDs added.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <input
            placeholder="Label (e.g. Ground Floor)"
            value={label}
            onChange={(e) => updateLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
            className="input text-sm"
          />
        </div>
        <div className="flex-1">
          <input
            placeholder="UPI ID"
            value={upiId}
            onChange={(e) => updateUpiId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
            className="input text-sm"
          />
        </div>
        <button
          onClick={submitAdd}
          disabled={addMutation.isPending}
          className="btn-primary whitespace-nowrap"
        >
          <Plus size={16} /> {addMutation.isPending ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
