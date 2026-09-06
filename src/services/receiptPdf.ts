import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatINR } from '../utils/money'
import { applyRupeeFont, RUPEE_FONT_STYLES } from '../utils/pdfFont'
import { loadImageForPdf } from '../utils/pdfImage'
import type { Bill, ElectricityReading, Payment, Property, Receipt, Tenant } from '../types/database'

export interface ReceiptPdfInput {
  receipt: Receipt
  payment: Payment
  bill: Bill
  tenant: Tenant
  property: Property
  /** Owner's branding logo (public URL), if configured. Drawn top-right. */
  logoUrl?: string | null
  /** The electricity_readings row matching this bill's tenant + billing
   * month, if one exists. Omitted gracefully (no rows added) when absent. */
  reading?: ElectricityReading | null
  /** Owner's display name, for the "Contact the owner" line. */
  ownerName?: string | null
  /** Owner's phone, for the "Contact the owner" line. Omitted gracefully
   * when absent. */
  ownerPhone?: string | null
}

export async function buildReceiptPdf({
  receipt,
  payment,
  bill,
  tenant,
  property,
  logoUrl,
  reading,
  ownerName,
  ownerPhone,
}: ReceiptPdfInput): Promise<jsPDF> {
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
  doc.text('Rent Receipt', 40, 100)
  doc.setFontSize(10)
  doc.text(`Receipt #: ${receipt.receipt_number}`, 40, 118)
  doc.text(`Date: ${new Date(payment.payment_date).toLocaleDateString('en-IN')}`, 40, 132)

  doc.text(`Tenant: ${tenant.full_name}`, 40, 154)
  doc.text(`Phone: ${tenant.phone || 'No phone on file'}`, 40, 168)
  doc.text(`Billing month: ${new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`, 40, 182)

  const readingRows =
    reading != null
      ? [
          ['Previous reading', String(reading.previous_reading)],
          ['Current reading', String(reading.current_reading)],
          ['Rate per unit (₹)', formatINR(reading.rate_per_unit)],
        ]
      : []

  autoTable(doc, {
    startY: 200,
    head: [['Description', 'Amount']],
    body: [
      ['Rent', formatINR(bill.rent_amount)],
      ...readingRows,
      ['Electricity units', String(bill.electricity_units)],
      ['Electricity', formatINR(bill.electricity_charge)],
      ['Other charges', formatINR(bill.other_charges)],
      ['Late fee', formatINR(bill.late_fee)],
      ['Previous balance', formatINR(bill.previous_balance)],
      ['Previous credit', formatINR(-bill.previous_credit)],
      ['Total due (this bill)', formatINR(bill.total_due)],
      ['This payment', formatINR(payment.amount)],
      ['Payment method', payment.method.toUpperCase()],
    ],
    styles: { fontSize: 9, ...RUPEE_FONT_STYLES },
    headStyles: RUPEE_FONT_STYLES,
    theme: 'grid',
  })

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFontSize(9)
  if (ownerPhone) {
    doc.text(`Questions about this bill? Contact ${ownerName || 'the owner'}: ${ownerPhone}`, 40, finalY + 24)
    finalY += 14
  }
  doc.text('This is a computer-generated receipt.', 40, finalY + 24)

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
