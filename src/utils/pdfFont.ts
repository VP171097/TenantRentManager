import type jsPDF from 'jspdf'
import { DEJAVU_SANS_BASE64 } from '../assets/fonts/dejaVuSansBase64'

/** Registers the embedded DejaVu Sans subset (which includes the ₹ glyph,
 * unlike jsPDF's built-in fonts) on a doc and switches to it. Call this
 * once, right after creating the jsPDF instance, before drawing any text —
 * every subsequent doc.text()/autoTable() call will then render ₹
 * correctly instead of a fallback character. Only a 'normal' weight is
 * registered (no bold), so pass { fontStyle: 'normal' } explicitly to
 * autoTable's styles/headStyles rather than relying on its default bold
 * header style, which would silently fall back to a font without ₹. */
export function applyRupeeFont(doc: jsPDF): void {
  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_SANS_BASE64)
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal')
  doc.setFont('DejaVuSans', 'normal')
}

export const RUPEE_FONT_STYLES = { font: 'DejaVuSans', fontStyle: 'normal' as const }
