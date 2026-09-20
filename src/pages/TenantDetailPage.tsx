import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTenant, moveOutTenant, updateTenant, deleteTenant, listTenantDocuments } from '../services/tenants'
import {
  listBills,
  generateBill,
  listRentRevisions,
  addRentRevision,
  deleteBill,
  updateBillFull,
  dismissTenantPaidFlag,
} from '../services/billing'
import { listPayments, recordPayment, generateReceipt } from '../services/payments'
import {
  getLatestReading,
  getReadingForMonth,
  listElectricityReadings,
  recordElectricityReading,
  resolveLastElectricityReading,
} from '../services/electricity'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ErrorState } from '../components/States'
import { SkeletonCardGrid } from '../components/Skeleton'
import { LedgerTable } from '../components/LedgerTable'
import { Modal } from '../components/Modal'
import { RentRevisionModal } from '../components/forms/RentRevisionModal'
import { GenerateBillModal } from '../components/forms/GenerateBillModal'
import { EditBillModal } from '../components/forms/EditBillModal'
import { PaymentForm } from '../components/forms/PaymentForm'
import { TenantForm } from '../components/forms/TenantForm'
import { Field } from '../components/forms/PropertyForm'
import { DocumentUploader, DocumentList } from '../components/DocumentUploader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { extractFunctionErrorMessage, friendlyError } from '../utils/errors'
import { applicableRent } from '../utils/billing'
import { formatINR } from '../utils/money'
import { downloadReceiptPdf, receiptPdfBase64 } from '../services/receiptPdf'
import { downloadBillPdf, billPdfBase64 } from '../services/billPdf'
import { downloadLeasePdf } from '../services/leasePdf'
import { CreateTenantLoginForm } from '../components/CreateTenantLoginForm'
import { OwnerResetPasswordForm } from '../components/OwnerResetPasswordForm'
import { InviteTenantForm } from '../components/InviteTenantForm'
import type { Bill } from '../types/database'
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
  const [sendingBillId, setSendingBillId] = useState<string | null>(null)
  const [sendStatus, setSendStatus] = useState<string | null>(null)
  const [reminderBillId, setReminderBillId] = useState<string | null>(null)
  const [prefillBillId, setPrefillBillId] = useState<string | null>(null)
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
  const { data: docs = [], refetch: refetchDocs } = useQuery({
    queryKey: ['tenant-documents', id],
    queryFn: () => listTenantDocuments(id!),
    enabled: !!id,
  })
  const { data: latestReading } = useQuery({
    queryKey: ['latest-reading', id],
    queryFn: () => getLatestReading(id!),
    enabled: !!id,
  })
  const { data: readings } = useQuery({
    queryKey: ['electricity-readings', id],
    queryFn: () => listElectricityReadings({ tenantId: id }),
    enabled: !!id,
  })
  // The month "Generate This Month's Bill" always targets — must match
  // generateBillMutation's own computation below exactly.
  const currentBillingMonth = new Date().toISOString().slice(0, 7) + '-01'
  // Robust "previous reading to carry forward" — unlike latestReading
  // above (which comes back null whenever the most recent month had no
  // electricity_readings row, e.g. a "Skip / Carry Forward" bill), this
  // correctly skips over skipped months to the last CHARGED reading. Used
  // to default the "Generate Bill" modal's previous reading. Scoped
  // strictly BEFORE this month — otherwise regenerating/re-editing this
  // exact month's own (possibly since-corrected) bill would leak its own
  // reading back in as its "previous", instead of August's.
  const { data: resolvedLastReading } = useQuery({
    queryKey: ['resolved-last-reading', id, currentBillingMonth],
    queryFn: () => resolveLastElectricityReading(id!, currentBillingMonth),
    enabled: !!id,
  })
  const editingBillReading = readings?.find((r) => r.billing_month === editingBill?.billing_month) ?? null
  // Same robust resolution, but as of the bill being edited — only needed
  // when that bill has no exact reading row of its own (e.g. it was
  // generated with "Skip / Carry Forward", so opening Edit Bill to add
  // electricity retroactively should start from the real carried-forward
  // reading, not default to 0.
  const { data: resolvedEditPreviousReading } = useQuery({
    queryKey: ['resolved-edit-previous-reading', editingBill?.id],
    queryFn: () => resolveLastElectricityReading(id!, editingBill!.billing_month),
    enabled: !!id && !!editingBill && !editingBillReading,
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
      const billingMonth = currentBillingMonth
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
      const payment = await recordPayment({ ...values, tenant_id: id!, recorded_by: profile?.id, is_approved: profile?.role === 'owner' })
      return payment
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['bills', id] })
      queryClient.invalidateQueries({ queryKey: ['payments', id] })
      setShowPaymentForm(false)
      // Best-effort: email/WhatsApp a payment confirmation with the receipt
      // attached. This must never surface as a payment-recording failure —
      // the payment itself already succeeded — so failures here only show
      // a soft status note, same spot as the manual Send Bill status.
      void sendPaymentConfirmation(payment.id)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  async function sendPaymentConfirmation(paymentId: string) {
    try {
      const receipt = await generateReceipt(paymentId)
      const freshPayments = await listPayments({ tenantId: id! })
      const payment = freshPayments.find((p) => p.id === paymentId)
      const freshBills = await listBills({ tenantId: id! })
      const bill = freshBills.find((b) => b.id === payment?.bill_id)
      if (!payment || !bill || !tenant) return

      const { data: property } = await supabase.from('properties').select('*').eq('id', tenant.property_id).single()
      if (!property) return

      const [{ data: ownerProfileForReceipt }, { data: roomForReceipt }] = await Promise.all([
        supabase.from('profiles').select('logo_url, full_name, phone, email').eq('id', tenant.owner_id).maybeSingle(),
        supabase.from('rooms').select('room_number').eq('id', bill.room_id).maybeSingle(),
      ])
      const readingForReceipt = await getReadingForMonth(tenant.id, bill.billing_month).catch(() => null)
      const pdfBase64 = await receiptPdfBase64({
        receipt,
        payment,
        bill,
        tenant,
        property,
        logoUrl: (ownerProfileForReceipt as { logo_url?: string } | null)?.logo_url,
        roomNumber: (roomForReceipt as { room_number?: string } | null)?.room_number,
        reading: readingForReceipt,
        ownerName: (ownerProfileForReceipt as { full_name?: string } | null)?.full_name,
        ownerPhone: (ownerProfileForReceipt as { phone?: string } | null)?.phone,
        ownerEmail: (ownerProfileForReceipt as { email?: string } | null)?.email,
      })
      const { data, error: fnError } = await supabase.functions.invoke('send-bill', {
        body: { billId: bill.id, mode: 'receipt', paymentId: payment.id, pdfBase64 },
      })
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError))
      const result = data as { whatsapp?: string; email?: string; error?: string }
      if (result?.error) {
        setSendStatus(`Payment confirmation not sent: ${result.error}`)
      } else if (result) {
        const emailPart = result.email && !result.email.startsWith('skipped') ? `, Email: ${result.email}` : ''
        setSendStatus(`Payment confirmation — WhatsApp: ${result.whatsapp}${emailPart}`)
      }
    } catch (err) {
      // Non-fatal: the payment is already saved. Just note it quietly.
      setSendStatus(`Payment confirmation not sent: ${friendlyError(err)}`)
    }
  }

  const moveOutMutation = useMutation({
    mutationFn: (values: {
      move_out_date: string
      previous_reading: number
      final_current_reading: number
      deposit_deduction: number
      deduction_reason: string
      bill_rent: boolean
      bill_electricity: boolean
    }) =>
      moveOutTenant({
        tenant_id: id!,
        move_out_date: values.move_out_date,
        final_billing_month: values.move_out_date.slice(0, 7) + '-01',
        previous_reading: values.previous_reading,
        final_current_reading: values.final_current_reading,
        deposit_deduction: values.deposit_deduction,
        deduction_reason: values.deduction_reason,
        bill_rent: values.bill_rent,
        bill_electricity: values.bill_electricity,
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
        phone: values.phone || null,
        email: values.email || null,
        property_id: values.property_id,
        room_id: values.room_id,
        security_deposit: values.security_deposit,
        electricity_start_reading: values.electricity_start_reading,
        electricity_rate: values.electricity_rate,
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
    mutationFn: (values: {
      rent_amount: number
      previous_reading: number
      current_reading: number
      rate_per_unit: number
      is_meter_reset: boolean
      other_charges: number
      late_fee: number
      notes: string
    }) => updateBillFull({ bill_id: editingBill!.id, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', id] })
      queryClient.invalidateQueries({ queryKey: ['electricity-readings', id] })
      queryClient.invalidateQueries({ queryKey: ['latest-reading', id] })
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
        const [{ data: property }, { data: ownerProfile }, { data: room }, readingForReceipt] = await Promise.all([
          supabase.from('properties').select('*').eq('id', tenant.property_id).single(),
          supabase.from('profiles').select('logo_url, full_name, phone, email').eq('id', tenant.owner_id).maybeSingle(),
          supabase.from('rooms').select('room_number').eq('id', bill.room_id).maybeSingle(),
          getReadingForMonth(tenant.id, bill.billing_month).catch(() => null),
        ])
        if (property)
          downloadReceiptPdf({
            receipt,
            payment,
            bill,
            tenant,
            property,
            logoUrl: (ownerProfile as { logo_url?: string } | null)?.logo_url,
            roomNumber: (room as { room_number?: string } | null)?.room_number,
            reading: readingForReceipt,
            ownerName: (ownerProfile as { full_name?: string } | null)?.full_name,
            ownerPhone: (ownerProfile as { phone?: string } | null)?.phone,
            ownerEmail: (ownerProfile as { email?: string } | null)?.email,
          })
      }
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  async function handleGenerateLease() {
    try {
      const { data: property } = await supabase.from('properties').select('*').eq('id', tenant!.property_id).single()
      const { data: ownerProfile } = await supabase.from('profiles').select('full_name').eq('id', tenant!.owner_id).maybeSingle()
      const { data: room } = tenant!.room_id
        ? await supabase.from('rooms').select('room_number').eq('id', tenant!.room_id).maybeSingle()
        : { data: null }
      if (property) {
        await downloadLeasePdf({
          tenant: tenant!,
          property,
          ownerName: (ownerProfile as { full_name?: string } | null)?.full_name ?? 'Owner',
          roomNumber: (room as { room_number?: string } | null)?.room_number,
          currentRent,
        })
      }
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  async function handleDownloadBill(bill: Bill) {
    try {
      const { data: property } = await supabase.from('properties').select('*').eq('id', tenant!.property_id).single()
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('upi_id, logo_url, full_name, phone, email')
        .eq('id', tenant!.owner_id)
        .maybeSingle()
      const { data: room } = await supabase.from('rooms').select('room_number, upi_id_id').eq('id', bill.room_id).maybeSingle()
      let finalUpiId = (ownerProfile as { upi_id?: string } | null)?.upi_id
      if (room?.upi_id_id) {
        const { data: upiRecord } = await supabase.from('upi_ids').select('upi_id').eq('id', room.upi_id_id).maybeSingle()
        if (upiRecord?.upi_id) finalUpiId = upiRecord.upi_id
      }
      const reading = await getReadingForMonth(tenant!.id, bill.billing_month).catch(() => null)
      if (property) {
        await downloadBillPdf({
          bill,
          tenant: tenant!,
          property,
          upiId: finalUpiId,
          roomNumber: (room as { room_number?: string } | null)?.room_number,
          logoUrl: (ownerProfile as { logo_url?: string } | null)?.logo_url,
          reading,
          ownerName: (ownerProfile as { full_name?: string } | null)?.full_name,
          ownerPhone: (ownerProfile as { phone?: string } | null)?.phone,
          ownerEmail: (ownerProfile as { email?: string } | null)?.email,
        })
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
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('upi_id, logo_url, full_name, phone, email')
        .eq('id', tenant!.owner_id)
        .maybeSingle()
      const { data: room } = await supabase.from('rooms').select('room_number, upi_id_id').eq('id', bill.room_id).maybeSingle()
      let finalUpiId = (ownerProfile as { upi_id?: string } | null)?.upi_id
      if (room?.upi_id_id) {
        const { data: upiRecord } = await supabase.from('upi_ids').select('upi_id').eq('id', room.upi_id_id).maybeSingle()
        if (upiRecord?.upi_id) finalUpiId = upiRecord.upi_id
      }
      const reading = await getReadingForMonth(tenant!.id, bill.billing_month).catch(() => null)
      let pdfBase64: string | undefined
      if (property) {
        pdfBase64 = await billPdfBase64({
          bill,
          tenant: tenant!,
          property,
          upiId: finalUpiId,
          roomNumber: (room as { room_number?: string } | null)?.room_number,
          logoUrl: (ownerProfile as { logo_url?: string } | null)?.logo_url,
          reading,
          ownerName: (ownerProfile as { full_name?: string } | null)?.full_name,
          ownerPhone: (ownerProfile as { phone?: string } | null)?.phone,
          ownerEmail: (ownerProfile as { email?: string } | null)?.email,
        })
      }
      const { data, error: fnError } = await supabase.functions.invoke('send-bill', {
        body: { billId: bill.id, pdfBase64 },
      })
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError))
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

  // Lighter nudge — no PDF attachment, reminder wording server-side. See
  // supabase/functions/send-bill/index.ts's `mode: 'reminder'` branch.
  async function handleSendReminder(bill: Bill) {
    setReminderBillId(bill.id)
    setSendStatus(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-bill', {
        body: { billId: bill.id, mode: 'reminder' },
      })
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError))
      const result = data as { whatsapp?: string; email?: string; error?: string }
      if (result.error) {
        setSendStatus(`Could not send reminder: ${result.error}`)
      } else {
        const waOk = result.whatsapp === 'sent'
        const emailPart = result.email && !result.email.startsWith('skipped') ? `, Email: ${result.email}` : ''
        setSendStatus(`Reminder — WhatsApp: ${waOk ? 'sent' : result.whatsapp}${emailPart}`)
      }
    } catch (err) {
      setSendStatus(friendlyError(err))
    } finally {
      setReminderBillId(null)
    }
  }

  const dismissFlagMutation = useMutation({
    mutationFn: (billId: string) => dismissTenantPaidFlag(billId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills', id] }),
    onError: (err) => setError(friendlyError(err)),
  })

  if (isLoading) return <SkeletonCardGrid count={3} />
  if (loadError || !tenant) return <ErrorState message="Could not load tenant." onRetry={() => refetch()} />

  const currentRent = revisions && revisions.length > 0 ? applicableRent(revisions, new Date().toISOString().slice(0, 10)) : 0
  const outstandingBills = (bills ?? []).filter((b) => b.balance > 0)
  const thisMonth = new Date().toISOString().slice(0, 7) + '-01'
  const thisMonthBill = (bills ?? []).find((b) => b.billing_month === thisMonth)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {tenant.avatar_url && (
            <img src={tenant.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{tenant.full_name}</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {tenant.phone || 'No phone on file'} {tenant.email && `· ${tenant.email}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowEditTenant(true)} className="btn-secondary px-4">
            Edit
          </button>
          <button onClick={handleGenerateLease} className="btn-secondary px-4">
            Generate Lease Agreement
          </button>
          {tenant.status === 'active' && (
            <button onClick={() => setShowMoveOut(true)} className="btn-secondary px-4">
              Move Out
            </button>
          )}
          <button onClick={() => setShowDeleteTenant(true)} className="btn-secondary px-4 text-red-600 dark:text-red-400">
            Delete Tenant
          </button>
        </div>
      </div>

      <Modal open={showEditTenant} title="Edit Tenant" onClose={() => setShowEditTenant(false)}>
        <TenantForm
          defaultValues={{
            full_name: tenant.full_name,
            phone: tenant.phone ?? '',
            email: tenant.email ?? '',
            property_id: tenant.property_id,
            room_id: tenant.room_id ?? '',
            move_in_date: tenant.move_in_date,
            security_deposit: tenant.security_deposit,
            initial_rent: currentRent,
            electricity_start_reading: tenant.electricity_start_reading ?? 0,
            electricity_rate: tenant.electricity_rate ?? 0,
          }}
          onSubmit={(v) => editTenantMutation.mutateAsync(v)}
          submitLabel="Save Changes"
        />
      </Modal>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <div className="card max-w-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Current rent</span>
          <span className="font-semibold">{formatINR(currentRent)}</span>
        </div>
        {tenant.security_deposit > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Security deposit</span>
            <span className="font-semibold">{formatINR(tenant.security_deposit)}</span>
          </div>
        )}
        <button onClick={() => setShowRentModal(true)} className="btn-secondary mt-2 w-full">
          Revise Rent
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {thisMonthBill ? (
          <button
            onClick={() => (profile?.role === 'owner' ? setEditingBill(thisMonthBill) : undefined)}
            disabled={profile?.role !== 'owner'}
            className="btn-primary px-4 disabled:opacity-60"
          >
            This Month's Bill Already Exists{profile?.role === 'owner' ? ' — Edit It' : ''}
          </button>
        ) : (
          <button onClick={() => setShowGenerateBill(true)} className="btn-primary px-4">
            Generate This Month's Bill
          </button>
        )}
        <button onClick={() => setShowPaymentForm((s) => !s)} className="btn-secondary px-4">
          {showPaymentForm ? 'Close' : 'Record Payment'}
        </button>
      </div>
      {thisMonthBill && (
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          A bill for this month already exists — use "Edit It" above (or Edit on that row below) to update the
          electricity reading, rent, or charges instead of generating again.
        </p>
      )}

      {showPaymentForm && (
        <div className="card max-w-md">
          <PaymentForm
            bills={outstandingBills.length ? outstandingBills : bills ?? []}
            defaultBillId={prefillBillId ?? undefined}
            onSubmit={(v) => paymentMutation.mutateAsync(v)}
          />
        </div>
      )}

      {outstandingBills
        .filter((b) => b.tenant_marked_paid)
        .map((b) => (
          <div key={b.id} className="card border-amber-200 bg-amber-50">
            <p className="font-semibold text-amber-800">
              Tenant says this is paid ({formatINR(b.balance)} still shows as due) — please confirm.
            </p>
            {b.tenant_marked_paid_note && (
              <p className="mt-1 text-sm text-amber-700">Reference/note: {b.tenant_marked_paid_note}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setPrefillBillId(b.id)
                  setShowPaymentForm(true)
                }}
                className="btn-primary px-4"
              >
                Confirm & Record Payment
              </button>
              <button
                onClick={() => dismissFlagMutation.mutate(b.id)}
                disabled={dismissFlagMutation.isPending}
                className="btn-secondary px-4"
              >
                Not Received / Dismiss
              </button>
            </div>
          </div>
        ))}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Billing history</h2>
        {bills && bills.length > 0 ? (
          <LedgerTable
            bills={bills}
            onEdit={profile?.role === 'owner' ? (b) => setEditingBill(b) : undefined}
            onDelete={(b) => setDeletingBill(b)}
          />
        ) : (
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">No bills yet.</p>
        )}
        {bills && bills.length > 0 && (
          <div className="mt-3 space-y-2">
            {sendStatus && <p className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">{sendStatus}</p>}
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
                {b.balance > 0 && (
                  <button
                    onClick={() => handleSendReminder(b)}
                    disabled={reminderBillId === b.id}
                    className="btn-secondary px-4"
                  >
                    {reminderBillId === b.id ? 'Sending…' : 'Send Reminder'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-slate-100">Tenant Login</h2>
        {!tenant.phone && !tenant.email && !tenant.profile_id && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            This tenant hasn't provided contact details yet — generate an invite link so they can set up their own
            account.
          </p>
        )}
        <CreateTenantLoginForm tenant={tenant} />
        {tenant.profile_id && <OwnerResetPasswordForm kind="tenant" id={tenant.id} />}
        <InviteTenantForm tenant={tenant} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Payments & Receipts</h2>
        <div className="space-y-2">
          {payments?.map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{formatINR(p.amount)}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  {new Date(p.payment_date).toLocaleDateString('en-IN')} · {p.method.toUpperCase()}
                </p>
              </div>
              <button onClick={() => handleReceipt(p.id)} className="btn-secondary px-4">
                Receipt
              </button>
            </div>
          ))}
          {(!payments || payments.length === 0) && <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">No payments recorded yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Documents</h2>
        {profile && (
          <DocumentUploader
            ownerId={tenant.owner_id}
            propertyId={tenant.property_id}
            tenantId={tenant.id}
            onUploaded={() => refetchDocs()}
          />
        )}
        <div className="mt-3">
          <DocumentList docs={docs} />
        </div>
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
        defaultPreviousReading={resolvedLastReading ?? latestReading?.current_reading ?? 0}
        defaultRatePerUnit={latestReading?.rate_per_unit ?? 0}
        onClose={() => setShowGenerateBill(false)}
        onSubmit={(values) => generateBillMutation.mutateAsync(values)}
      />

      <MoveOutDialog
        open={showMoveOut}
        defaultPreviousReading={resolvedLastReading}
        onCancel={() => setShowMoveOut(false)}
        onConfirm={(values) => moveOutMutation.mutateAsync(values)}
      />

      <EditBillModal
        open={!!editingBill}
        bill={editingBill}
        reading={editingBillReading}
        fallbackPreviousReading={resolvedEditPreviousReading}
        onClose={() => setEditingBill(null)}
        onSubmit={(values) => editBillMutation.mutateAsync(values)}
      />

      <ConfirmDialog
        open={!!deletingBill}
        title="Delete bill"
        message="This will permanently delete this bill and any payments/receipts recorded against it. This cannot be undone."
        confirmLabel="Delete Bill"
        danger
        pending={deleteBillMutation.isPending}
        onCancel={() => setDeletingBill(null)}
        onConfirm={() => deleteBillMutation.mutate()}
      />

      <ConfirmDialog
        open={showDeleteTenant}
        title="Delete tenant"
        message="This will permanently delete this tenant AND all their bills, payments, and history. This cannot be undone. Consider using 'Move Out' instead if you just want to mark them inactive."
        confirmLabel="Delete Tenant"
        danger
        pending={deleteTenantMutation.isPending}
        onCancel={() => setShowDeleteTenant(false)}
        onConfirm={() => deleteTenantMutation.mutate()}
      />
    </div>
  )
}

function MoveOutDialog({
  open,
  defaultPreviousReading,
  onCancel,
  onConfirm,
}: {
  open: boolean
  /** The tenant's last known meter reading, used to default "Previous
   * electricity meter reading" below — resolved the same robust way as
   * everywhere else (resolveLastElectricityReading), never just 0. */
  defaultPreviousReading?: number
  onCancel: () => void
  onConfirm: (values: {
    move_out_date: string
    previous_reading: number
    final_current_reading: number
    deposit_deduction: number
    deduction_reason: string
    bill_rent: boolean
    bill_electricity: boolean
  }) => Promise<void>
}) {
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().slice(0, 10))
  const [previousReading, setPreviousReading] = useState(defaultPreviousReading ?? 0)
  const [reading, setReading] = useState(0)
  const [deduction, setDeduction] = useState(0)
  const [reason, setReason] = useState('')
  const [whatToBill, setWhatToBill] = useState<'both' | 'rent_only' | 'electricity_only'>('both')
  const [submitting, setSubmitting] = useState(false)

  // defaultPreviousReading resolves asynchronously and may still be
  // undefined on first render — sync it in once it arrives, but only if
  // the field still holds the naive 0 default, so it never clobbers a
  // value already being edited.
  useEffect(() => {
    if (defaultPreviousReading != null && previousReading === 0) {
      setPreviousReading(defaultPreviousReading)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPreviousReading])

  if (!open) return null

  return (
    <ConfirmDialog
      open={open}
      title="Move-out settlement"
      message="This will settle the tenant's final bill, apply the deposit refund/deduction, and mark them as moved out."
      confirmLabel="Confirm Move-out"
      danger
      pending={submitting}
      onCancel={onCancel}
      onConfirm={() => {
        setSubmitting(true)
        onConfirm({
          move_out_date: moveOutDate,
          previous_reading: previousReading,
          final_current_reading: reading,
          deposit_deduction: deduction,
          deduction_reason: reason,
          bill_rent: whatToBill !== 'electricity_only',
          bill_electricity: whatToBill !== 'rent_only',
        }).finally(() => setSubmitting(false))
      }}
    >
      <div className="mt-3 space-y-3 text-left">
        <Field label="Move-out date">
          <input type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} className="input" />
        </Field>
        <Field label="What to bill on move-out">
          <select value={whatToBill} onChange={(e) => setWhatToBill(e.target.value as typeof whatToBill)} className="input">
            <option value="both">Rent + Electricity (normal)</option>
            <option value="rent_only">Rent only — electricity already settled separately</option>
            <option value="electricity_only">Electricity only — rent for this month already paid</option>
          </select>
        </Field>
        <Field label="Previous electricity meter reading">
          <input type="number" min="0" value={previousReading} onChange={(e) => setPreviousReading(Number(e.target.value))} className="input" />
        </Field>
        <Field label="Final electricity meter reading">
          <input type="number" min="0" value={reading} onChange={(e) => setReading(Number(e.target.value))} className="input" />
        </Field>
        <Field label="Deposit deduction (₹) — leave 0 to refund the full deposit">
          <input type="number" min="0" value={deduction} onChange={(e) => setDeduction(Number(e.target.value))} className="input" />
        </Field>
        <Field label="Reason for deduction (optional)">
          <input type="text" placeholder="e.g. damage to wall, unreturned key" value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
        </Field>
      </div>
    </ConfirmDialog>
  )
}
