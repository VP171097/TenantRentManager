import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatINRPdf } from '../utils/money'
import type { Bill, Payment, Property, Receipt, Tenant } from '../types/database'

export interface ReceiptPdfInput {
  receipt: Receipt
  payment: Payment
  bill: Bill
  tenant: Tenant
  property: Property
}

export function buildReceiptPdf({ receipt, payment, bill, tenant, property }: ReceiptPdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' })

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
  doc.text(`Phone: ${tenant.phone}`, 40, 168)
  doc.text(`Billing month: ${new Date(bill.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`, 40, 182)

  autoTable(doc, {
    startY: 200,
    head: [['Description', 'Amount']],
    body: [
      ['Rent', formatINRPdf(bill.rent_amount)],
      ['Electricity', formatINRPdf(bill.electricity_charge)],
      ['Other charges', formatINRPdf(bill.other_charges)],
      ['Late fee', formatINRPdf(bill.late_fee)],
      ['Previous balance', formatINRPdf(bill.previous_balance)],
      ['Previous credit', formatINRPdf(-bill.previous_credit)],
      ['Total due (this bill)', formatINRPdf(bill.total_due)],
      ['This payment', formatINRPdf(payment.amount)],
      ['Payment method', payment.method.toUpperCase()],
    ],
    styles: { fontSize: 9 },
    theme: 'grid',
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFontSize(9)
  doc.text('This is a computer-generated receipt.', 40, finalY + 24)

  return doc
}

export function downloadReceiptPdf(input: ReceiptPdfInput) {
  const doc = buildReceiptPdf(input)
  doc.save(`${input.receipt.receipt_number}.pdf`)
}
