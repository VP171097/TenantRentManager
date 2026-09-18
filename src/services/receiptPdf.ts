import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatINR } from '../utils/money'
import { applyRupeeFont, RUPEE_FONT_STYLES } from '../utils/pdfFont'
import { drawHeader, drawTitleRow, drawKvPanel, drawFooterBar, BRAND_TEAL, BRAND_TEAL_LIGHT } from '../utils/pdfLetterhead'
import type { Bill, ElectricityReading, Payment, Property, Receipt, Tenant } from '../types/database'

export interface ReceiptPdfInput {
  receipt: Receipt
  payment: Payment
  bill: Bill
  tenant: Tenant
  property: Property
  /** Owner's branding logo — unused; RentSlate branding is app-default,
   * not per-owner. Kept only so call sites don't need to change. */
  logoUrl?: string | null
  /** Room number/name, if known — shown as "Room: <roomNumber>". */
  roomNumber?: string | null
  /** The electricity_readings row matching this bill's tenant + billing
   * month, if one exists. Omitted gracefully (no rows added) when absent. */
  reading?: ElectricityReading | null
  /** Owner's display name, for the "Contact the owner" line. */
  ownerName?: string | null
  /** Owner's phone, for the "Contact the owner" line. Omitted gracefully
   * when absent — requires the owner to have a phone saved on their own
   * Profile page; it is not fabricated. */
  ownerPhone?: string | null
  /** Owner's email, shown in the header contact line. Omitted gracefully
   * when absent, same as ownerPhone. */
  ownerEmail?: string | null
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
}

export async function buildReceiptPdf({
  receipt,
  payment,
  bill,
  tenant,
  property,
  roomNumber,
  reading,
  ownerName,
  ownerPhone,
  ownerEmail,
}: ReceiptPdfInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' })
  applyRupeeFont(doc)
  const pageWidth = doc.internal.pageSize.getWidth()

  const monthLabel = new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const methodLabel = PAYMENT_METHOD_LABEL[payment.method] ?? payment.method
  // The one thing this whole document must never blur: whether the tenant
  // still owes money after this specific payment. bill.balance already
  // reflects every payment recorded against it, including this one.
  const balanceAfter = bill.balance > 0 ? bill.balance : 0
  const isFullyPaid = balanceAfter <= 0

  let y = drawHeader(doc, {
    propertyName: property.name,
    address: property.address,
    city: property.city,
    ownerPhone,
    ownerEmail,
  })

  y = drawTitleRow(doc, y, { docTitle: 'RENT RECEIPT', numberLabel: 'Receipt Number', numberValue: receipt.receipt_number })

  const panelGap = 10
  const leftWidth = (pageWidth - 40 - panelGap) * 0.55
  const rightWidth = pageWidth - 40 - panelGap - leftWidth
  const rightX = 20 + leftWidth + panelGap

  const tenantBottom = drawKvPanel(doc, 20, leftWidth, y, "Tenant's Details", [
    { label: 'Name', value: tenant.full_name },
    { label: 'Room', value: roomNumber ?? '—' },
    { label: 'Phone Number', value: tenant.phone || '—' },
  ])
  const dateBottom = drawKvPanel(doc, rightX, rightWidth, y, null, [
    { label: 'Billing Month', value: monthLabel },
    { label: 'Payment Date', value: new Date(payment.payment_date).toLocaleDateString('en-IN') },
    { label: 'Paid Via', value: methodLabel },
  ])
  let tableStartY = Math.max(tenantBottom, dateBottom) + 12

  const billPrevReading = bill.previous_electricity_reading ?? reading?.previous_reading ?? null
  const billCurrReading = bill.current_electricity_reading ?? reading?.current_reading ?? null
  const readingLabel = billPrevReading != null && billCurrReading != null
    ? `${billPrevReading} to ${billCurrReading} (${bill.electricity_units} units)`
    : `${bill.electricity_units} units`
  const rateLabel = reading ? formatINR(reading.rate_per_unit) : '—'
  // A room with electricity turned off never has a reading and never
  // charges for it — omit the row entirely rather than showing a ₹0 line.
  const hasElectricity = billPrevReading != null || billCurrReading != null || bill.electricity_charge > 0

  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Reading', 'Rate', 'Amount']],
    body: [
      ['Rent', '—', '—', formatINR(bill.rent_amount)],
      ...(hasElectricity ? [['Electricity', readingLabel, rateLabel, formatINR(bill.electricity_charge)]] : []),
      ['Other charges', '—', '—', formatINR(bill.other_charges)],
      ['Late fee', '—', '—', formatINR(bill.late_fee)],
    ],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    styles: { fontSize: 8.5, ...RUPEE_FONT_STYLES },
    headStyles: { ...RUPEE_FONT_STYLES, fillColor: BRAND_TEAL, textColor: [255, 255, 255] },
    theme: 'grid',
  })

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20

  doc.setFont('DejaVuSans', 'normal')
  doc.setFontSize(9)
  const totalsRows: [string, string][] = [
    ['Total Due', formatINR(bill.total_due)],
    ['Amount Paid', formatINR(payment.amount)],
  ]
  totalsRows.forEach(([label, value]) => {
    doc.setTextColor(51, 65, 85)
    doc.text(label, pageWidth - 200, finalY)
    doc.text(value, pageWidth - 20, finalY, { align: 'right' })
    finalY += 13
  })
  const statusTeal: [number, number, number] = [13, 148, 136]
  const statusAmber: [number, number, number] = [180, 83, 9]
  doc.setDrawColor(...(isFullyPaid ? statusTeal : statusAmber))
  doc.setLineWidth(1)
  doc.line(pageWidth - 200, finalY - 2, pageWidth - 20, finalY - 2)
  finalY += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...(isFullyPaid ? statusTeal : statusAmber))
  doc.text(isFullyPaid ? 'Fully Paid' : 'Balance Due', pageWidth - 200, finalY)
  doc.setFont('DejaVuSans', 'normal')
  doc.text(isFullyPaid ? formatINR(0) : formatINR(balanceAfter), pageWidth - 20, finalY, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  finalY += 24

  // Payment Confirmation — a clear PAID / PARTIAL badge so nobody mistakes
  // a part-payment receipt for proof the bill is settled.
  const boxTop = finalY
  doc.setFillColor(...BRAND_TEAL_LIGHT)
  doc.rect(20, boxTop, pageWidth - 40, 13, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('PAYMENT CONFIRMATION', 26, boxTop + 9)

  const badgeColor = isFullyPaid ? statusTeal : statusAmber
  const badgeLabel = isFullyPaid ? 'PAID' : 'PARTIAL'
  doc.setDrawColor(...badgeColor)
  doc.setLineWidth(1.25)
  doc.roundedRect(26, boxTop + 22, 66, 26, 4, 4)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...badgeColor)
  doc.text(badgeLabel, 26 + 33, boxTop + 22 + 16, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(`Received via ${methodLabel}`, 26 + 78, boxTop + 32)
  doc.setFont('DejaVuSans', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  let lineY = boxTop + 44
  if (payment.reference) {
    doc.text(`Reference: ${payment.reference}`, 26 + 78, lineY)
    lineY += 11
  }
  doc.text(`Received by: ${property.name}`, 26 + 78, lineY)
  doc.setTextColor(0, 0, 0)
  finalY = boxTop + 60

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  if (ownerPhone) {
    doc.text(`Questions about this receipt? Contact ${ownerName || 'the owner'}: ${ownerPhone}`, 20, finalY + 14)
    finalY += 14
  }
  doc.setTextColor(0, 0, 0)

  const footerText = isFullyPaid
    ? `Payment received in full — thank you for choosing ${property.name}.`
    : `Partial payment received — ${formatINR(balanceAfter)} still due.`
  drawFooterBar(doc, finalY + 10, footerText)

  return doc
}

export async function downloadReceiptPdf(input: ReceiptPdfInput) {
  const doc = await buildReceiptPdf(input)
  doc.save(`${input.receipt.receipt_number}.pdf`)
}

/** Returns the receipt PDF as a base64 string (no data: prefix) for emailing. */
export async function receiptPdfBase64(input: ReceiptPdfInput): Promise<string> {
  const doc = await buildReceiptPdf(input)
  const dataUri = doc.output('datauristring')
  return dataUri.split(',')[1]
}
