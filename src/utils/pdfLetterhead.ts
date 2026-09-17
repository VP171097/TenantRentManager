import type jsPDF from 'jspdf'

const BRAND_BLUE: [number, number, number] = [61, 71, 199]
const GRAY_TEXT: [number, number, number] = [100, 100, 100]
const LINE_COLOR: [number, number, number] = [20, 50, 120]

export interface LetterheadOptions {
  logoUrl?: string | null
  propertyName: string
  address?: string | null
  city?: string | null
  docTitle: string
  metaLines?: string[]
}

const HEADER_HEIGHT = 70

/**
 * Draws the RentBook letterhead.
 */
export async function drawLetterhead(doc: jsPDF, opts: LetterheadOptions): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // --- HEADER ---
  
  // 1. Logo Approximation (Left)
  const logoX = 20
  const logoY = 15
  const logoSize = 24
  
  doc.setFillColor(...BRAND_BLUE)
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 4, 4, 'F')
  
  // White house/text approximation in logo
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  // Centered 'R' as a fallback logo graphic
  doc.text('R', logoX + 12, logoY + 16, { align: 'center', baseline: 'middle' })
  
  // 2. RentBook Text
  doc.setTextColor(...BRAND_BLUE)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('RentBook', logoX + logoSize + 8, logoY + 14)
  
  // Subtitle
  doc.setTextColor(...GRAY_TEXT)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Rent, Simplified.', logoX + logoSize + 9, logoY + 22)

  // 3. Contact Info (Right)
  doc.setFontSize(8)
  const rightColX = pageWidth - 20
  const labelX = rightColX - 140 // Increased gap to prevent long website URLs from overlapping label
  
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND_BLUE)
  doc.text('PHONE', labelX, logoY + 4)
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text('+91-7011088059', rightColX, logoY + 4, { align: 'right' })

  // subtle separator
  doc.setDrawColor(240, 240, 240)
  doc.line(labelX, logoY + 9, rightColX, logoY + 9)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND_BLUE)
  doc.text('EMAIL', labelX, logoY + 16)
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text('vp522099@gmail.com', rightColX, logoY + 16, { align: 'right' })

  // subtle separator
  doc.line(labelX, logoY + 21, rightColX, logoY + 21)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND_BLUE)
  doc.text('WEBSITE', labelX, logoY + 28)
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont('helvetica', 'normal')
  // Read from the page's actual current location at generation time, not a
  // baked-in constant — this line then always matches wherever the app is
  // actually being served from (default github.io URL or a custom domain),
  // with no code change needed if that ever moves.
  const siteHost = `${window.location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  doc.text(siteHost, rightColX, logoY + 28, { align: 'right' })

  // 4. Horizontal Line
  doc.setDrawColor(...LINE_COLOR)
  doc.setLineWidth(2)
  doc.line(15, logoY + 32, 80, logoY + 32)
  doc.setDrawColor(...LINE_COLOR)
  doc.setLineWidth(0.5)
  doc.line(80, logoY + 32, pageWidth - 15, logoY + 32)

  // --- FOOTER ---
  // We draw the footer directly here so it applies to the page
  const footerY = pageHeight - 15
  doc.setDrawColor(...LINE_COLOR)
  doc.setLineWidth(0.5)
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5)
  
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont('helvetica', 'normal')
  const footerText = 'RENTBOOK   |   RENT, SIMPLIFIED.   |   +91-7011088059   |   vp522099@gmail.com'
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' })

  // --- DOCUMENT META ---
  let currentY = HEADER_HEIGHT + 15 // Start a bit lower

  // We still need to print the Property Name, because this bill is FOR that property
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.propertyName, 20, currentY)
  
  if (opts.city) {
    currentY += 16
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(opts.city, 20, currentY)
  }

  currentY += 24 // Bigger gap before RENT BILL

  // Document Title (e.g., RENT BILL)
  doc.setTextColor(...BRAND_BLUE)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.docTitle, 20, currentY)

  // Meta lines (e.g. Bill #, Date)
  doc.setTextColor(80, 80, 80)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  ;(opts.metaLines ?? []).forEach((line, i) => {
    // We position the meta lines aligned with the document title
    doc.text(line, pageWidth - 20, currentY - (opts.metaLines!.length - 1 - i) * 14, { align: 'right' })
  })

  doc.setTextColor(0, 0, 0)
  return currentY + 16
}

export { BRAND_BLUE as LETTERHEAD_BLUE, BRAND_BLUE as LETTERHEAD_BLUE_LIGHT }
