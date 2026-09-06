import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { formatINR } from '../utils/money'
import { applyRupeeFont, RUPEE_FONT_STYLES } from '../utils/pdfFont'
import { buildUpiLink } from '../utils/upi'
import { drawLetterhead } from '../utils/pdfLetterhead'
import type { Bill, ElectricityReading, Property, Tenant } from '../types/database'

export interface BillPdfInput {
  bill: Bill
  tenant: Tenant
  property: Property
  /** Owner's UPI ID, if configured. When absent the QR/UPI section is omitted. */
  upiId?: string | null
  /** Room number/name, if known — shown as "Room: <roomNumber>". */
  roomNumber?: string | null
  /** Owner's branding logo (public URL), if configured. Drawn top-left on
   * the letterhead band. */
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
  const pageWidth = doc.internal.pageSize.getWidth()

  const billDate = new Date(bill.billing_month)
  const monthLabel = billDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const balance = bill.balance > 0 ? bill.balance : 0

  // Bill number: month + year + room number, e.g. "SEP2026-101".
  const monthCode = billDate.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
  const billNumber = `${monthCode}${billDate.getFullYear()}-${roomNumber ?? tenant.id.slice(0, 4).toUpperCase()}`

  const bodyTop = await drawLetterhead(doc, {
    logoUrl,
    propertyName: property.name,
    city: property.city,
    docTitle: 'RENT BILL',
    metaLines: [`Bill #: ${billNumber}`, `Billing month: ${monthLabel}`],
  })

  // Left: tenant info block.
  doc.setFontSize(10)
  doc.text(`Tenant: ${tenant.full_name}`, 20, bodyTop + 20)
  doc.text(`Phone: ${tenant.phone || 'No phone on file'}`, 20, bodyTop + 34)
  doc.text(`Room: ${roomNumber ?? '—'}`, 20, bodyTop + 48)

  // Right: UPI QR block, positioned in the body (not the header band) so
  // it sits above the charges table, alongside the tenant info block.
  // Computed before the property block below so that block can leave
  // room for it and wrap onto extra lines instead of running underneath it.
  const qrSize = 78
  const qrReservedWidth = upiId ? qrSize + 16 : 0
  let qrBottom = bodyTop
  if (upiId) {
    const link = buildUpiLink({ upiId, payeeName: property.name, amount: balance, note: `Rent ${monthLabel}` })
    try {
      const qrDataUrl = await QRCode.toDataURL(link, { margin: 1, width: 200 })
      const qrX = pageWidth - 20 - qrSize
      const qrY = bodyTop + 6
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
      doc.setFontSize(8)
      doc.text('Scan to pay via UPI', qrX + qrSize / 2, qrY + qrSize + 11, { align: 'center' })
      doc.text(upiId, qrX + qrSize / 2, qrY + qrSize + 22, { align: 'center' })
      qrBottom = qrY + qrSize + 30
    } catch {
      // QR generation failing should never block the bill PDF itself.
    }
  }

  // Property name/address block — fills the whitespace below the tenant
  // info block, left-aligned, clearly labeled. Wraps within whatever width
  // is left of the QR code (if any) so long addresses drop to their own
  // line instead of running under/off the page.
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(`Property name: ${property.name}`, 20, bodyTop + 66)
  const addressText = property.address || '—'
  const addressWrapWidth = pageWidth - 40 - qrReservedWidth
  const wrappedAddress = doc.splitTextToSize(`Property Address: ${addressText}`, addressWrapWidth)
  doc.text(wrappedAddress, 20, bodyTop + 78)
  doc.setTextColor(0, 0, 0)
  const propertyBlockBottom = bodyTop + 78 + wrappedAddress.length * 11

  const readingRows =
    reading != null
      ? [
          ['Previous reading', String(reading.previous_reading)],
          ['Current reading', String(reading.current_reading)],
          ['Rate per unit (₹)', formatINR(reading.rate_per_unit)],
        ]
      : []

  const tableStartY = Math.max(propertyBlockBottom, qrBottom) + 12

  autoTable(doc, {
    startY: tableStartY,
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
    headStyles: { ...RUPEE_FONT_STYLES, fillColor: [30, 58, 138] },
    theme: 'grid',
  })

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  doc.setFontSize(9)
  if (ownerPhone) {
    doc.text(`Questions about this bill? Contact ${ownerName || 'the owner'}: ${ownerPhone}`, 20, finalY + 20)
    finalY += 14
  }
  doc.setTextColor(130, 130, 130)
  doc.text('This is a computer-generated bill.', 20, finalY + 20)
  doc.setTextColor(0, 0, 0)

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
