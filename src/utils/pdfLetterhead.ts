import type jsPDF from 'jspdf'

// RentSlate brand teal, matching --color-brand-* in src/index.css.
export const BRAND_TEAL: [number, number, number] = [13, 148, 136] // brand-600
export const BRAND_TEAL_DARK: [number, number, number] = [17, 94, 89] // brand-800
export const BRAND_TEAL_LIGHT: [number, number, number] = [204, 251, 241] // brand-100
export const BRAND_TEAL_LIGHTER: [number, number, number] = [240, 253, 250] // brand-50
const TEXT_DARK: [number, number, number] = [15, 23, 42] // slate-900
const TEXT_MUTED: [number, number, number] = [51, 65, 85] // slate-700
const TEXT_FAINT: [number, number, number] = [100, 116, 139] // slate-500
const LINE_FAINT: [number, number, number] = [226, 232, 240] // slate-200

const MARGIN = 20

export interface LetterheadOptions {
  propertyName: string
  address?: string | null
  city?: string | null
  ownerPhone?: string | null
  ownerEmail?: string | null
}

/** Draws the shared document header: property/owner contact block on the
 * left (real data — nothing fabricated), the RentSlate wordmark on the
 * right (app-default branding, not per-owner — see the design doc's
 * "no per-owner branding" decision), and a teal rule beneath. Returns the
 * y-coordinate content should start at below the header. */
export function drawHeader(doc: jsPDF, opts: LetterheadOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = MARGIN + 8

  // Left: property name + address + phone/email, whatever is actually on file.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...TEXT_DARK)
  doc.text(opts.propertyName, MARGIN, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MUTED)
  const addressLine = [opts.address, opts.city].filter(Boolean).join(', ')
  if (addressLine) {
    const wrapped = doc.splitTextToSize(addressLine, pageWidth * 0.55)
    doc.text(wrapped, MARGIN, y)
    y += wrapped.length * 10
  }
  const contactLine = [opts.ownerPhone, opts.ownerEmail].filter(Boolean).join('   |   ')
  if (contactLine) {
    doc.text(contactLine, MARGIN, y)
    y += 10
  }

  // Right: RentSlate wordmark (fixed app branding, right-aligned).
  const markRight = pageWidth - MARGIN
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  const slateW = doc.getTextWidth('SLATE')
  doc.setTextColor(...BRAND_TEAL)
  doc.text('SLATE', markRight, MARGIN + 14, { align: 'right' })
  doc.setTextColor(...TEXT_DARK)
  doc.text('RENT', markRight - slateW, MARGIN + 14, { align: 'right' })
  const rentW = doc.getTextWidth('RENT')
  const markSize = 15
  const markX = markRight - slateW - rentW - 6 - markSize
  doc.setFillColor(...BRAND_TEAL_DARK)
  doc.roundedRect(markX, MARGIN + 1, markSize, markSize, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('R', markX + markSize / 2, MARGIN + 1 + markSize / 2 + 3, { align: 'center' })

  const headerBottom = Math.max(y, MARGIN + 1 + markSize) + 8
  doc.setDrawColor(...BRAND_TEAL)
  doc.setLineWidth(1.5)
  doc.line(MARGIN, headerBottom, pageWidth - MARGIN, headerBottom)
  doc.setTextColor(0, 0, 0)

  return headerBottom + 14
}

export interface TitleRowOptions {
  docTitle: string
  numberLabel: string
  numberValue: string
}

/** Draws the teal "document title" band alongside a bordered document-number
 * box (bill number / receipt number). Returns the next content y. */
export function drawTitleRow(doc: jsPDF, y: number, opts: TitleRowOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const boxWidth = 130
  const gap = 10
  const titleWidth = pageWidth - MARGIN * 2 - boxWidth - gap
  const rowHeight = 30

  doc.setFillColor(...BRAND_TEAL_LIGHT)
  doc.rect(MARGIN, y, titleWidth, rowHeight, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...TEXT_DARK)
  doc.text(opts.docTitle, MARGIN + 10, y + rowHeight / 2 + 4)

  const boxX = MARGIN + titleWidth + gap
  doc.setFillColor(...BRAND_TEAL_LIGHT)
  doc.rect(boxX, y, boxWidth, 13, 'F')
  doc.setFontSize(7.5)
  doc.text(opts.numberLabel.toUpperCase(), boxX + 6, y + 9)

  doc.setDrawColor(...BRAND_TEAL)
  doc.setLineWidth(0.75)
  doc.rect(boxX, y + 13, boxWidth, rowHeight - 13)
  doc.setFontSize(10)
  doc.text(opts.numberValue, boxX + 6, y + 13 + (rowHeight - 13) / 2 + 3)

  doc.setTextColor(0, 0, 0)
  return y + rowHeight + 14
}

export interface KvRow {
  label: string
  value: string
}

/** Draws a shaded-header panel with label/value rows — used for the
 * "Tenant's Details" and billing-date panels. Returns the panel's bottom y. */
export function drawKvPanel(doc: jsPDF, x: number, width: number, y: number, header: string | null, rows: KvRow[]): number {
  let cursorY = y
  if (header) {
    doc.setFillColor(...BRAND_TEAL_LIGHT)
    doc.rect(x, cursorY, width, 13, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_DARK)
    doc.text(header, x + 6, cursorY + 9)
    cursorY += 13
  }

  const labelWidth = width * 0.4
  const rowHeight = 15
  rows.forEach((row) => {
    doc.setFillColor(...BRAND_TEAL_LIGHTER)
    doc.rect(x, cursorY, labelWidth, rowHeight, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...TEXT_DARK)
    const labelLines = doc.splitTextToSize(row.label, labelWidth - 8)
    doc.text(labelLines, x + 5, cursorY + 9)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MUTED)
    const valueLines = doc.splitTextToSize(row.value, width - labelWidth - 10)
    doc.text(valueLines, x + labelWidth + 5, cursorY + 9)

    const linesUsed = Math.max(labelLines.length, valueLines.length)
    const actualRowHeight = Math.max(rowHeight, linesUsed * 10 + 4)
    doc.setDrawColor(...LINE_FAINT)
    doc.setLineWidth(0.5)
    doc.line(x, cursorY + actualRowHeight, x + width, cursorY + actualRowHeight)
    cursorY += actualRowHeight
  })

  doc.setTextColor(0, 0, 0)
  return cursorY
}

/** Draws the closing teal footer bar with a thank-you/status line. */
export function drawFooterBar(doc: jsPDF, y: number, text: string): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  const lines = doc.splitTextToSize(text, pageWidth - MARGIN * 2 - 20)
  const barHeight = lines.length * 11 + 16
  // Bottom-anchor rather than overflow the page if the content above ran
  // long enough to push this past the page edge (e.g. a wrapped footer line).
  const barY = Math.min(y, pageHeight - MARGIN - barHeight)
  doc.setFillColor(...BRAND_TEAL_LIGHTER)
  doc.rect(MARGIN, barY, pageWidth - MARGIN * 2, barHeight, 'F')
  doc.setTextColor(...BRAND_TEAL_DARK)
  doc.text(lines, pageWidth / 2, barY + 13, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  return barY + barHeight
}

export { TEXT_FAINT, TEXT_MUTED, TEXT_DARK }
