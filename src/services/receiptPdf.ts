import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatINR } from '../utils/money'
import { applyRupeeFont, RUPEE_FONT_STYLES } from '../utils/pdfFont'
import { drawLetterhead } from '../utils/pdfLetterhead'
import type { Bill, ElectricityReading, Payment, Property, Receipt, Tenant } from '../types/database'

export interface ReceiptPdfInput {
  receipt: Receipt
  payment: Payment
  bill: Bill
  tenant: Tenant
  property: Property
  /** Owner's branding logo (public URL), if configured. Drawn top-left on
   * the letterhead band. */
  logoUrl?: string | null
  /** The electricity_readings row matching this bill's tenant + billing
   * month, if one exists. Omitted gracefully (no rows added) when absent. */
  reading?: ElectricityReading | null
  /** Owner's display name, for the "Contact the owner" line. */
  ownerName?: string | null
  /** Owner's phone, for the "Contact the owner" line. Omitted gracefully
   * when absent — requires the owner to have a phone saved on their own
   * Profile page; it is not fabricated. */
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

  const bodyTop = await drawLetterhead(doc, {
    logoUrl,
    propertyName: property.name,
    address: property.address,
    city: property.city,
    docTitle: 'PAYMENT RECEIPT',
    metaLines: [`Receipt #: ${receipt.receipt_number}`, `Date: ${new Date(payment.payment_date).toLocaleDateString('en-IN')}`],
  })

  doc.setFontSize(10)
  doc.text(`Tenant: ${tenant.full_name}`, 20, bodyTop + 20)
  doc.text(`Phone: ${tenant.phone || 'No phone on file'}`, 20, bodyTop + 34)
  doc.text(`Billing month: ${new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`, 20, bodyTop + 48)

  const readingRows =
    reading != null
      ? [
          ['Previous reading', String(reading.previous_reading)],
          ['Current reading', String(reading.current_reading)],
          ['Rate per unit (₹)', formatINR(reading.rate_per_unit)],
        ]
      : []

  autoTable(doc, {
    startY: bodyTop + 66,
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
    headStyles: { ...RUPEE_FONT_STYLES, fillColor: [30, 58, 138] },
    theme: 'grid',
  })

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFontSize(9)
  if (ownerPhone) {
    doc.text(`Questions about this bill? Contact ${ownerName || 'the owner'}: ${ownerPhone}`, 20, finalY + 24)
    finalY += 14
  }
  doc.setTextColor(130, 130, 130)
  doc.text('This is a computer-generated receipt.', 20, finalY + 24)
  doc.setTextColor(0, 0, 0)

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
