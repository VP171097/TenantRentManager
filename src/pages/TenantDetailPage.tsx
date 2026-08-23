import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTenant, moveOutTenant, updateTenant, deleteTenant } from '../services/tenants'
import { listBills, generateBill, listRentRevisions, addRentRevision, deleteBill, updateBillCharges } from '../services/billing'
import { listPayments, recordPayment, generateReceipt } from '../services/payments'
import { getLatestReading, recordElectricityReading } from '../services/electricity'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { LoadingState, ErrorState } from '../components/States'
import { LedgerTable } from '../components/LedgerTable'
import { RentRevisionModal } from '../components/forms/RentRevisionModal'
import { GenerateBillModal } from '../components/forms/GenerateBillModal'
import { EditBillModal } from '../components/forms/EditBillModal'
import { PaymentForm } from '../components/forms/PaymentForm'
import { TenantForm } from '../components/forms/TenantForm'
import { DocumentUploader } from '../components/DocumentUploader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { friendlyError } from '../utils/errors'
import { applicableRent } from '../utils/billing'
import { formatINR } from '../utils/money'
import { downloadReceiptPdf } from '../services/receiptPdf'
import { downloadBillPdf, billPdfBase64 } from '../services/billPdf'
import { CreateTenantLoginForm } from '../components/CreateTenantLoginForm'
import type { TenantDocument, Bill } from '../types/database'
import type { TenantFormValues } from '../utils/validation'

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showRentModal, setShowRentModal] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showMoveOut, setShowMoveOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docs, setDocs] = useState<TenantDocument[]>([])
  const [sendingBillId, setSendingBillId] = useState<string | null>(null)
  const [sendStatus, setSendStatus] = useState<string | null>(null)
  const [showGenerateBill, setShowGenerateBill] = useState(false)
  const [showEditTenant, setShowEditTenant] = useState(false)
  const [showDeleteTenant, setShowDeleteTenant] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null)

  const { data: tenant, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => getTenant(id!),
    enabled: !!id,
  })
  const { data: bills } = useQuery({ queryKey: ['bills', id], queryFn: () => listBills({ tenantId: id }), enabled: !!id })
  const { data: revisions } = useQuery({ queryKey: ['rent-revisions', id], queryFn: () => listRentRevisions(id!), enabled: !!id })
  const { data: payments } = useQuery({ queryKey: ['payments', id], queryFn: () => listPayments({ tenantId: id }), enabled: !!id })
  const { data: latestReading } = useQuery({
    queryKey: ['latest-reading', id],
    queryFn: () => getLatestReading(id!),
    enabled: !!id,
  })

  const generateBillMutation = useMutation({
    mutationFn: async (values: {
      previous_reading: number
      current_reading: number
      rate_per_unit: number
      is_meter_reset: boolean
      reset_explanation?: string
      other_charges: number
      late_fee: number
    }) => {
      const billingMonth = new Date().toISOString().slice(0, 7) + '-01'
      await recordElectricityReading({
        room_id: tenant!.room_id!,
        tenant_id: id!,
        billing_month: billingMonth,
        previous_reading: values.previous_reading,
        current_reading: values.current_reading,
        rate_per_unit: values.rate_per_unit,
        is_meter_reset: values.is_meter_reset,
        reset_explanation: values.reset_explanation,
      })
      return generateBill(id!, billingMonth, values.other_charges, values.late_fee)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', id] })
      queryClient.invalidateQueries({ queryKey: ['latest-reading', id] })
      setShowGenerateBill(false)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const revisionMutation = useMutation({
    mutationFn: (values: { effective_date: string; rent_amount: number; change_type: 'fixed' | 'percentage'; change_value: number }) =>
      addRentRevision({ tenant_id: id!, created_by: profile?.id, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-revisions', id] })
      setShowRentModal(false)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const paymentMutation = useMutation({
    mutationFn: async (values: { bill_id: string; amount: number; payment_date: string; method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'; reference?: string }) => {
      const payment = await recordPayment({ ...values, tenant_id: id!, recorded_by: profile?.id })
      return payment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', id] })
      queryClient.invalidateQueries({ queryKey: ['payments', id] })
      setShowPaymentForm(false)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const moveOutMutation = useMutation({
    mutationFn: (values: { move_out_date: string; final_current_reading: number; deposit_deduction: number; deduction_reason: string }) =>
      moveOutTenant({
        tenant_id: id!,
        move_out_date: values.move_out_date,
        final_billing_month: values.move_out_date.slice(0, 7) + '-01',
        final_current_reading: values.final_current_reading,
        deposit_deduction: values.deposit_deduction,
        deduction_reason: values.deduction_reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['bills', id] })
      setShowMoveOut(false)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const editTenantMutation = useMutation({
    mutationFn: (values: TenantFormValues) =>
      updateTenant(id!, {
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || undefined,
        property_id: values.property_id,
        room_id: values.room_id,
        security_deposit: values.security_deposit,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowEditTenant(false)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const deleteTenantMutation = useMutation({
    mutationFn: () => deleteTenant(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      navigate('/tenants')
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const editBillMutation = useMutation({
    mutationFn: (values: { other_charges: number; late_fee: number; notes: string }) =>
      updateBillCharges({ bill_id: editingBill!.id, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', id] })
      setEditingBill(null)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const deleteBillMutation = useMutation({
    mutationFn: () => deleteBill(deletingBill!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', id] })
      queryClient.invalidateQueries({ queryKey: ['payments', id] })
      setDeletingBill(null)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  async function handleReceipt(paymentId: string) {
    try {
      const receipt = await generateReceipt(paymentId)
      const payment = payments?.find((p) => p.id === paymentId)
      const bill = bills?.find((b) => b.id === payment?.bill_id)
      if (payment && bill && tenant) {
        const { data: property } = await supabase.from('properties').select('*').eq('id', tenant.property_id).single()
        if (property) downloadReceiptPdf({ receipt, payment, bill, tenant, property })
      }
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  async function handleDownloadBill(bill: Bill) {
    try {
      const { data: property } = await supabase.from('properties').select('*').eq('id', tenant!.property_id).single()
      const { data: ownerProfile } = await supabase.from('profiles').select('upi_id').eq('id', tenant!.owner_id).maybeSingle()
      if (property) {
        await downloadBillPdf({ bill, tenant: tenant!, property, upiId: (ownerProfile as { upi_id?: string } | null)?.upi_id })
      }
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  async function handleSendBill(bill: Bill) {
    setSendingBillId(bill.id)
    setSendStatus(null)
    try {
      const { data: property } = await supabase.from('properties').select('*').eq('id', tenant!.property_id).single()
      const { data: ownerProfile } = await supabase.from('profiles').select('upi_id').eq('id', tenant!.owner_id).maybeSingle()
      let pdfBase64: string | undefined
      if (property) {
        pdfBase64 = await billPdfBase64({ bill, tenant: tenant!, property, upiId: (ownerProfile as { upi_id?: string } | null)?.upi_id })
      }
      const { data, error: fnError } = await supabase.functions.invoke('send-bill', {
        body: { billId: bill.id, pdfBase64 },
      })
      if (fnError) throw fnError
      const result = data as { whatsapp?: string; email?: string; error?: string }
      if (result.error) {
        setSendStatus(`Could not send bill: ${result.error}`)
      } else {
        const waOk = result.whatsapp === 'sent'
        const emailPart = result.email && !result.email.startsWith('skipped') ? `, Email: ${result.email}` : ''
        setSendStatus(`WhatsApp: ${waOk ? 'sent' : result.whatsapp}${emailPart}`)
      }
    } catch (err) {
      setSendStatus(friendlyError(err))
    } finally {
      setSendingBillId(null)
    }
  }

  if (isLoading) return <LoadingState />
  if (loadError || !tenant) return <ErrorState message="Could not load tenant." onRetry={() => refetch()} />

  const currentRent = revisions && revisions.length > 0 ? applicableRent(revisions, new Date().toISOString().slice(0, 10)) : 0
  const outstandingBills = (bills ?? []).filter((b) => b.balance > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{tenant.full_name}</h1>
          <p className="text-slate-500">
            {tenant.phone} {tenant.email && `· ${tenant.email}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowEditTenant(true)} className="btn-secondary px-4">
            Edit
          </button>
          {tenant.status === 'active' && (
            <button onClick={() => setShowMoveOut(true)} className="btn-secondary px-4">
              Move Out
            </button>
          )}
          <button onClick={() => setShowDeleteTenant(true)} className="btn-secondary px-4 text-red-600">
            Delete Tenant
          </button>
        </div>
      </div>

      {showEditTenant && (
        <div className="card max-w-md">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Edit Tenant</h2>
          <TenantForm
            defaultValues={{
              full_name: tenant.full_name,
              phone: tenant.phone,
              email: tenant.email ?? '',
              property_id: tenant.property_id,
              room_id: tenant.room_id ?? '',
              move_in_date: tenant.move_in_date,
              security_deposit: tenant.security_deposit,
              initial_rent: currentRent,
            }}
            onSubmit={(v) => editTenantMutation.mutateAsync(v)}
            submitLabel="Save Changes"
          />
          <button onClick={() => setShowEditTenant(false)} className="btn-secondary mt-3 w-full">
            Cancel
          </button>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="card max-w-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-500">Current rent</span>
          <span className="font-semibold">{formatINR(currentRent)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Security deposit</span>
          <span className="font-semibold">{formatINR(tenant.security_deposit)}</span>
        </div>
        <button onClick={() => setShowRentModal(true)} className="btn-secondary mt-2 w-full">
          Revise Rent
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => setShowGenerateBill(true)} className="btn-primary px-4">
          Generate This Month's Bill
        </button>
        <button onClick={() => setShowPaymentForm((s) => !s)} className="btn-secondary px-4">
          {showPaymentForm ? 'Close' : 'Record Payment'}
        </button>
      </div>

      {showPaymentForm && (
        <div className="card max-w-md">
          <PaymentForm bills={outstandingBills.length ? outstandingBills : bills ?? []} onSubmit={(v) => paymentMutation.mutateAsync(v)} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Billing history</h2>
        {bills && bills.length > 0 ? (
          <LedgerTable
            bills={bills}
            onEdit={profile?.role === 'owner' ? (b) => setEditingBill(b) : undefined}
            onDelete={(b) => setDeletingBill(b)}
          />
        ) : (
          <p className="text-slate-500">No bills yet.</p>
        )}
        {bills && bills.length > 0 && (
          <div className="mt-3 space-y-2">
            {sendStatus && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{sendStatus}</p>}
            {bills.slice(0, 1).map((b) => (
              <div key={b.id} className="flex flex-wrap gap-2">
                <button onClick={() => handleDownloadBill(b)} className="btn-secondary px-4">
                  Download Bill PDF
                </button>
                <button
                  onClick={() => handleSendBill(b)}
                  disabled={sendingBillId === b.id}
                  className="btn-primary px-4"
                >
                  {sendingBillId === b.id ? 'Sending…' : 'Send Bill (WhatsApp/Email)'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Tenant Login</h2>
        <CreateTenantLoginForm tenant={tenant} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Payments & Receipts</h2>
        <div className="space-y-2">
          {payments?.map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{formatINR(p.amount)}</p>
                <p className="text-sm text-slate-500">
                  {new Date(p.payment_date).toLocaleDateString('en-IN')} · {p.method.toUpperCase()}
                </p>
              </div>
              <button onClick={() => handleReceipt(p.id)} className="btn-secondary px-4">
                Receipt
              </button>
            </div>
          ))}
          {(!payments || payments.length === 0) && <p className="text-slate-500">No payments recorded yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Documents</h2>
        {profile && (
          <DocumentUploader
            ownerId={tenant.owner_id}
            propertyId={tenant.property_id}
            tenantId={tenant.id}
            onUploaded={(doc) => setDocs((d) => [...d, doc])}
          />
        )}
        <ul className="mt-3 space-y-1">
          {docs.map((d) => (
            <li key={d.id} className="text-sm text-slate-600">
              {d.file_name}
            </li>
          ))}
        </ul>
      </section>

      <RentRevisionModal
        open={showRentModal}
        currentRent={currentRent}
        tenantId={tenant.id}
        onClose={() => setShowRentModal(false)}
        onSubmit={(values) => revisionMutation.mutateAsync(values)}
      />

      <GenerateBillModal
        open={showGenerateBill}
        monthLabel={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        currentRent={currentRent}
        defaultPreviousReading={latestReading?.current_reading ?? 0}
        defaultRatePerUnit={latestReading?.rate_per_unit ?? 0}
        onClose={() => setShowGenerateBill(false)}
        onSubmit={(values) => generateBillMutation.mutateAsync(values)}
      />

      <MoveOutDialog
        open={showMoveOut}
        onCancel={() => setShowMoveOut(false)}
        onConfirm={(values) => moveOutMutation.mutateAsync(values)}
      />

      <EditBillModal
        open={!!editingBill}
        bill={editingBill}
        onClose={() => setEditingBill(null)}
        onSubmit={(values) => editBillMutation.mutateAsync(values)}
      />

      <ConfirmDialog
        open={!!deletingBill}
        title="Delete bill"
        message="This will permanently delete this bill and any payments/receipts recorded against it. This cannot be undone."
        confirmLabel="Delete Bill"
        danger
        onCancel={() => setDeletingBill(null)}
        onConfirm={() => deleteBillMutation.mutate()}
      />

      <ConfirmDialog
        open={showDeleteTenant}
        title="Delete tenant"
        message="This will permanently delete this tenant AND all their bills, payments, and history. This cannot be undone. Consider using 'Move Out' instead if you just want to mark them inactive."
        confirmLabel="Delete Tenant"
        danger
        onCancel={() => setShowDeleteTenant(false)}
        onConfirm={() => deleteTenantMutation.mutate()}
      />
    </div>
  )
}

function MoveOutDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: (values: { move_out_date: string; final_current_reading: number; deposit_deduction: number; deduction_reason: string }) => Promise<void>
}) {
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().slice(0, 10))
  const [reading, setReading] = useState(0)
  const [deduction, setDeduction] = useState(0)
  const [reason, setReason] = useState('')

  if (!open) return null

  return (
    <ConfirmDialog
      open={open}
      title="Move-out settlement"
      message="This will generate a final bill, apply the deposit refund/deduction, and mark the tenant as moved out."
      confirmLabel="Confirm Move-out"
      danger
      onCancel={onCancel}
      onConfirm={() => onConfirm({ move_out_date: moveOutDate, final_current_reading: reading, deposit_deduction: deduction, deduction_reason: reason }).then(() => {})}
    >
      <div className="mt-3 space-y-2 text-left">
        <input type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} className="input" />
        <input type="number" placeholder="Final meter reading" value={reading} onChange={(e) => setReading(Number(e.target.value))} className="input" />
        <input type="number" placeholder="Deposit deduction (₹)" value={deduction} onChange={(e) => setDeduction(Number(e.target.value))} className="input" />
        <input type="text" placeholder="Reason for deduction (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
      </div>
    </ConfirmDialog>
  )
}
