import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { formatINR } from '../utils/money'
import { applyRupeeFont, RUPEE_FONT_STYLES } from '../utils/pdfFont'
import { buildUpiLink } from '../utils/upi'
import { loadImageForPdf } from '../utils/pdfImage'
import type { Bill, ElectricityReading, Property, Tenant } from '../types/database'

export interface BillPdfInput {
  bill: Bill
  tenant: Tenant
  property: Property
  /** Owner's UPI ID, if configured. When absent the QR/UPI section is omitted. */
  upiId?: string | null
  /** Room number/name, if known — shown as "Room: <roomNumber>". */
  roomNumber?: string | null
  /** Owner's branding logo (public URL), if configured. Drawn top-right. */
  logoUrl?: string | null
  /** The electricity_readings row matching this bill's tenant + billing
   * month, if one exists — used to show previous/current meter readings
   * and the rate applied. Omitted gracefully (no rows added) when absent,
   * e.g. an older bill predating readings or a synthetic settlement bill. */
  reading?: ElectricityReading | null
  /** Owner's display name, for the "Contact the owner" line. */
  ownerName?: string | null
  /** Owner's phone, for the "Contact the owner" line. Omitted gracefully
   * when absent. */
  ownerPhone?: string | null
}

// NOTE: this is a separate generator from receiptPdf.ts by design — bills
// show a payment QR code, receipts (proof of a completed payment) never do.
export async function buildBillPdf({
  bill,
  tenant,
  property,
  upiId,
  roomNumber,
  logoUrl,
  reading,
  ownerName,
  ownerPhone,
}: BillPdfInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' })
  applyRupeeFont(doc)

  if (logoUrl) {
    const logo = await loadImageForPdf(logoUrl, 70, 36)
    if (logo) {
      const format = logo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(logo.dataUrl, format, doc.internal.pageSize.getWidth() - 40 - logo.w, 20, logo.w, logo.h)
    }
  }

  doc.setFontSize(16)
  doc.text(property.name, 40, 40)
  doc.setFontSize(10)
  doc.text(property.address ?? '', 40, 58)
  doc.text(property.city ?? '', 40, 72)

  doc.setFontSize(14)
  doc.text('Rent Bill', 40, 100)
  doc.setFontSize(10)
  const monthLabel = new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  doc.text(`Billing month: ${monthLabel}`, 40, 118)
  doc.text(`Tenant: ${tenant.full_name}`, 40, 132)
  doc.text(`Phone: ${tenant.phone || 'No phone on file'}`, 40, 146)
  doc.text(`Room: ${roomNumber ?? '—'}`, 40, 160)

  const balance = bill.balance > 0 ? bill.balance : 0

  const readingRows =
    reading != null
      ? [
          ['Previous reading', String(reading.previous_reading)],
          ['Current reading', String(reading.current_reading)],
          ['Rate per unit (₹)', formatINR(reading.rate_per_unit)],
        ]
      : []

  autoTable(doc, {
    startY: 178,
    head: [['Description', 'Amount']],
    body: [
      ['Rent', formatINR(bill.rent_amount)],
      ...readingRows,
      ['Electricity units', String(bill.electricity_units)],
      ['Electricity charge', formatINR(bill.electricity_charge)],
      ['Other charges', formatINR(bill.other_charges)],
      ['Late fee', formatINR(bill.late_fee)],
      ['Previous balance', formatINR(bill.previous_balance)],
      ['Previous credit', formatINR(-bill.previous_credit)],
      ['Total due (this bill)', formatINR(bill.total_due)],
      ['Amount paid so far', formatINR(bill.total_paid)],
      ['Outstanding balance', formatINR(balance)],
    ],
    styles: { fontSize: 9, ...RUPEE_FONT_STYLES },
    headStyles: RUPEE_FONT_STYLES,
    theme: 'grid',
  })

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  if (upiId) {
    const link = buildUpiLink({
      upiId,
      payeeName: property.name,
      amount: balance,
      note: `Rent ${monthLabel}`,
    })
    try {
      const qrDataUrl = await QRCode.toDataURL(link, { margin: 1, width: 200 })
      const qrY = finalY + 20
      doc.addImage(qrDataUrl, 'PNG', 40, qrY, 100, 100)
      doc.setFontSize(10)
      doc.text(`Pay via UPI: ${upiId}`, 150, qrY + 40)
      doc.text('Scan the QR code with any UPI app.', 150, qrY + 56)
      finalY = qrY + 110
    } catch {
      // QR generation failing should never block the bill PDF itself.
    }
  }

  doc.setFontSize(9)
  if (ownerPhone) {
    doc.text(`Questions about this bill? Contact ${ownerName || 'the owner'}: ${ownerPhone}`, 40, finalY + 20)
    finalY += 14
  }
  doc.text('This is a computer-generated bill.', 40, finalY + 20)

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
