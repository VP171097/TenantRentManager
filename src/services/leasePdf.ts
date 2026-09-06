import jsPDF from 'jspdf'
import { formatINR } from '../utils/money'
import { applyRupeeFont } from '../utils/pdfFont'
import type { Property, Tenant } from '../types/database'

export interface LeasePdfInput {
  tenant: Tenant
  property: Property
  ownerName: string
  roomNumber?: string | null
  currentRent: number
}

const CLAUSES = [
  'Term & Renewal: This agreement takes effect from the tenant\'s move-in date and continues on a month-to-month basis until terminated by either party as per the notice period below.',
  'Notice Period: Either party must give at least 30 days\' written notice before vacating or asking the tenant to vacate the premises.',
  'Rent Payment: Rent is due on or before the 5th of each calendar month, payable by the mode agreed with the owner (cash, UPI, or bank transfer).',
  'Security Deposit: The security deposit is refundable at the end of the tenancy, less any deductions for damages, unpaid dues, or outstanding electricity/utility charges, after final inspection.',
  'Maintenance: The tenant is responsible for day-to-day upkeep and cleanliness of the room. The owner is responsible for structural repairs and major fixtures. Any damage caused by tenant negligence will be charged to the tenant.',
  'No Subletting: The tenant may not sublet, assign, or share the premises with any other person without the owner\'s prior written consent.',
  'Utilities: Electricity charges are billed separately based on actual meter readings, as reflected in the monthly rent bill.',
  'Use of Premises: The premises shall be used only for residential purposes and not for any illegal or commercial activity.',
  'Inspection: The owner (or an authorized representative) may inspect the premises with reasonable prior notice to the tenant.',
  'Termination: The owner may terminate this agreement for non-payment of rent, damage to property, or violation of these terms, subject to applicable notice.',
]

export async function buildLeasePdf({ tenant, property, ownerName, roomNumber, currentRent }: LeasePdfInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  applyRupeeFont(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 48
  const maxWidth = pageWidth - marginX * 2
  let y = 56

  doc.setFontSize(16)
  doc.text('Rental / Lease Agreement', marginX, y)
  y += 26

  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, marginX, y)
  y += 24

  doc.setFontSize(11)
  const details = [
    `Property: ${property.name}`,
    `Address: ${[property.address, property.city].filter(Boolean).join(', ') || '—'}`,
    `Owner/Landlord: ${ownerName}`,
    '',
    `Tenant: ${tenant.full_name}`,
    `Tenant Phone: ${tenant.phone}`,
    `Room: ${roomNumber ?? '—'}`,
    `Move-in Date: ${new Date(tenant.move_in_date).toLocaleDateString('en-IN')}`,
    `Monthly Rent: ${formatINR(currentRent)}`,
    `Security Deposit: ${formatINR(tenant.security_deposit)}`,
  ]
  for (const line of details) {
    doc.text(line, marginX, y)
    y += 18
  }
  y += 10

  doc.setFontSize(13)
  doc.text('Terms & Conditions', marginX, y)
  y += 20
  doc.setFontSize(10)

  for (let i = 0; i < CLAUSES.length; i++) {
    const text = `${i + 1}. ${CLAUSES[i]}`
    const wrapped = doc.splitTextToSize(text, maxWidth) as string[]
    if (y + wrapped.length * 14 > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      y = 56
    }
    doc.text(wrapped, marginX, y)
    y += wrapped.length * 14 + 8
  }

  y += 20
  if (y > doc.internal.pageSize.getHeight() - 140) {
    doc.addPage()
    y = 56
  }
  doc.text('Owner/Landlord Signature: _______________________', marginX, y)
  y += 40
  doc.text('Tenant Signature: _______________________', marginX, y)
  y += 30

  doc.setFontSize(9)
  const disclaimer = doc.splitTextToSize(
    'This is a template document generated for convenience only and does not constitute legal advice. Please have it reviewed for your local rental laws before use.',
    maxWidth
  ) as string[]
  if (y + disclaimer.length * 12 > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    y = 56
  }
  doc.text(disclaimer, marginX, y)

  return doc
}

export async function downloadLeasePdf(input: LeasePdfInput) {
  const doc = await buildLeasePdf(input)
  doc.save(`Lease-Agreement-${input.tenant.full_name.replace(/\s+/g, '_')}.pdf`)
}
