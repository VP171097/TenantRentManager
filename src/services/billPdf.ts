import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { formatINR } from '../utils/money'
import { applyRupeeFont, RUPEE_FONT_STYLES } from '../utils/pdfFont'
import { buildUpiLink } from '../utils/upi'
import { drawHeader, drawTitleRow, drawKvPanel, drawFooterBar, BRAND_TEAL, BRAND_TEAL_LIGHT, BRAND_TEAL_DARK } from '../utils/pdfLetterhead'
import type { Bill, ElectricityReading, Property, Tenant } from '../types/database'

export interface BillPdfInput {
  bill: Bill
  tenant: Tenant
  property: Property
  /** Owner's UPI ID, if configured. When absent the QR/UPI section is omitted. */
  upiId?: string | null
  /** Room number/name, if known — shown as "Room: <roomNumber>". */
  roomNumber?: string | null
  /** Owner's branding logo — unused; RentSlate branding is app-default,
   * not per-owner. Kept only so call sites don't need to change. */
  logoUrl?: string | null
  /** The electricity_readings row matching this bill's tenant + billing
   * month, if one exists — used to show previous/current meter readings
   * and the rate applied. Omitted gracefully (no rows added) when absent,
   * e.g. an older bill predating readings or a synthetic settlement bill. */
  reading?: ElectricityReading | null
  /** Owner's display name, for the "Contact the owner" line. */
  ownerName?: string | null
  /** Owner's phone, for the "Contact the owner" line. Omitted gracefully
   * when absent — this requires the owner to have a phone saved on their
   * own Profile page; it is not fabricated. */
  ownerPhone?: string | null
  /** Owner's email, shown in the header contact line. Omitted gracefully
   * when absent, same as ownerPhone. */
  ownerEmail?: string | null
}

// NOTE: this is a separate generator from receiptPdf.ts by design — bills
// show a payment QR code, receipts (proof of a completed payment) never do.
export async function buildBillPdf({
  bill,
  tenant,
  property,
  upiId,
  roomNumber,
  reading,
  ownerName,
  ownerPhone,
  ownerEmail,
}: BillPdfInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' })
  applyRupeeFont(doc)
  const pageWidth = doc.internal.pageSize.getWidth()

  const billDate = new Date(bill.billing_month)
  const monthLabel = billDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const balance = bill.balance > 0 ? bill.balance : 0

  // Bill number: month + year + room number, e.g. "SEP2026-101".
  const monthCode = billDate.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
  const billNumber = `${monthCode}${billDate.getFullYear()}-${roomNumber ?? tenant.id.slice(0, 4).toUpperCase()}`

  let y = drawHeader(doc, {
    propertyName: property.name,
    address: property.address,
    city: property.city,
    ownerPhone,
    ownerEmail,
  })

  y = drawTitleRow(doc, y, { docTitle: 'RENT BILL', numberLabel: 'Bill Number', numberValue: billNumber })

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
    { label: 'Bill Date', value: new Date(bill.generated_at).toLocaleDateString('en-IN') },
    { label: 'Status', value: bill.status.charAt(0).toUpperCase() + bill.status.slice(1) },
  ])
  let tableStartY = Math.max(tenantBottom, dateBottom) + 12

  // Reading detail shown inline in the Electricity row, e.g. "412 → 458 (46 units)".
  const billPrevReading = bill.previous_electricity_reading ?? reading?.previous_reading ?? null
  const billCurrReading = bill.current_electricity_reading ?? reading?.current_reading ?? null
  const readingLabel = billPrevReading != null && billCurrReading != null
    ? `${billPrevReading} to ${billCurrReading} (${bill.electricity_units} units)`
    : `${bill.electricity_units} units`
  const rateLabel = reading ? formatINR(reading.rate_per_unit) : '—'

  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Reading', 'Rate', 'Amount']],
    body: [
      ['Rent', '—', '—', formatINR(bill.rent_amount)],
      ['Electricity', readingLabel, rateLabel, formatINR(bill.electricity_charge)],
      ['Other charges', '—', '—', formatINR(bill.other_charges)],
      ['Late fee', '—', '—', formatINR(bill.late_fee)],
    ],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    styles: { fontSize: 8.5, ...RUPEE_FONT_STYLES },
    headStyles: { ...RUPEE_FONT_STYLES, fillColor: BRAND_TEAL, textColor: [255, 255, 255] },
    theme: 'grid',
  })

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20

  // Totals block — same fields as the old single table, just laid out
  // right-aligned below the itemized charges instead of inline with them.
  doc.setFont('DejaVuSans', 'normal')
  doc.setFontSize(9)
  const totalsRows: [string, string][] = []
  if (bill.previous_balance > 0) totalsRows.push(['Previous balance', formatINR(bill.previous_balance)])
  if (bill.previous_credit > 0) totalsRows.push(['Previous credit', formatINR(-bill.previous_credit)])
  totalsRows.push(['Total Due', formatINR(bill.total_due)])
  if (bill.total_paid > 0) totalsRows.push(['Paid So Far', formatINR(bill.total_paid)])
  totalsRows.forEach(([label, value]) => {
    doc.setTextColor(51, 65, 85)
    doc.text(label, pageWidth - 200, finalY)
    doc.text(value, pageWidth - 20, finalY, { align: 'right' })
    finalY += 13
  })
  doc.setDrawColor(...BRAND_TEAL)
  doc.setLineWidth(1)
  doc.line(pageWidth - 200, finalY - 2, pageWidth - 20, finalY - 2)
  finalY += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BRAND_TEAL_DARK)
  doc.text('Balance Due', pageWidth - 200, finalY)
  doc.setFont('DejaVuSans', 'normal')
  doc.text(formatINR(balance), pageWidth - 20, finalY, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  finalY += 20

  // Payment Details — UPI QR, omitted entirely when the owner has no UPI ID configured.
  if (upiId) {
    const link = buildUpiLink({ upiId, payeeName: property.name, amount: balance, note: `Rent ${monthLabel}` })
    try {
      const qrDataUrl = await QRCode.toDataURL(link, { margin: 1, width: 200 })
      const boxHeight = 90
      doc.setFillColor(...BRAND_TEAL_LIGHT)
      doc.rect(20, finalY, pageWidth - 40, 13, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(15, 23, 42)
      doc.text('PAYMENT DETAILS', 26, finalY + 9)
      const qrSize = 62
      doc.addImage(qrDataUrl, 'PNG', 26, finalY + 20, qrSize, qrSize)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Scan to pay via UPI', 26 + qrSize + 12, finalY + 34)
      doc.setFont('DejaVuSans', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(51, 65, 85)
      doc.text(`${upiId}  |  ${property.name}`, 26 + qrSize + 12, finalY + 48)
      doc.text(`Amount pre-filled: ${formatINR(balance)}`, 26 + qrSize + 12, finalY + 60)
      doc.setTextColor(0, 0, 0)
      finalY += boxHeight
    } catch {
      // QR generation failing should never block the bill PDF itself.
    }
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  if (ownerPhone) {
    doc.text(`Questions about this bill? Contact ${ownerName || 'the owner'}: ${ownerPhone}`, 20, finalY + 14)
    finalY += 14
  }
  doc.setTextColor(0, 0, 0)

  drawFooterBar(doc, finalY + 10, `Thank you for choosing ${property.name} — powered by RentSlate.`)

  return doc
}

export async function downloadBillPdf(input: BillPdfInput) {
  const doc = await buildBillPdf(input)
  const monthKey = input.bill.billing_month.slice(0, 7)
  doc.save(`Bill-${input.tenant.full_name.replace(/\s+/g, '_')}-${monthKey}.pdf`)
}

/** Returns the bill PDF as a base64 string (no data: prefix) for emailing. */
export async function billPdfBase64(input: BillPdfInput): Promise<string> {
  const doc = await buildBillPdf(input)
  const dataUri = doc.output('datauristring')
  return dataUri.split(',')[1]
}
