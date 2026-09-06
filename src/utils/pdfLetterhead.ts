import type jsPDF from 'jspdf'
import { loadImageForPdf } from './pdfImage'

// Professional blue/white letterhead theme, shared by the Bill and Receipt
// PDFs. Deep blue band across the top (logo top-left, property name/address
// in white), document title + meta just below it in white space.
const BLUE: [number, number, number] = [30, 58, 138]
const BLUE_LIGHT: [number, number, number] = [191, 219, 254]

export interface LetterheadOptions {
  /** Owner's branding logo (public URL), if configured. Drawn top-left in
   * a white chip against the blue band. Omitted gracefully when absent. */
  logoUrl?: string | null
  propertyName: string
  address?: string | null
  city?: string | null
  /** e.g. "RENT BILL" or "PAYMENT RECEIPT" */
  docTitle: string
  /** Right-aligned lines under the title (e.g. billing month, receipt #, date). */
  metaLines?: string[]
}

const BAND_HEIGHT = 80

/** Draws the shared letterhead header + document title/meta. Returns the
 * y-coordinate below which the tenant-info/QR blocks and table should
 * start. */
export async function drawLetterhead(doc: jsPDF, opts: LetterheadOptions): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageWidth, BAND_HEIGHT, 'F')

  let textX = 20
  if (opts.logoUrl) {
    const logo = await loadImageForPdf(opts.logoUrl, 44, 44)
    if (logo) {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(16, 16, logo.w + 8, logo.h + 8, 5, 5, 'F')
      const format = logo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(logo.dataUrl, format, 20, 20, logo.w, logo.h)
      textX = 16 + logo.w + 8 + 12
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.text(opts.propertyName, textX, 38)

  doc.setFontSize(9)
  doc.setTextColor(...BLUE_LIGHT)
  if (opts.city) doc.text(opts.city, textX, 54)

  doc.setTextColor(...BLUE)
  doc.setFontSize(13)
  doc.text(opts.docTitle, 20, BAND_HEIGHT + 24)

  doc.setTextColor(90, 90, 90)
  doc.setFontSize(9)
  ;(opts.metaLines ?? []).forEach((line, i) => {
    doc.text(line, pageWidth - 20, BAND_HEIGHT + 16 + i * 12, { align: 'right' })
  })

  doc.setTextColor(0, 0, 0)
  return BAND_HEIGHT + 24
}

export { BLUE as LETTERHEAD_BLUE, BLUE_LIGHT as LETTERHEAD_BLUE_LIGHT }
