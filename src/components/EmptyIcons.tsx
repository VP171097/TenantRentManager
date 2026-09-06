/** Simple hand-drawn-style line icons for empty states — one per domain,
 * all inline SVG (no network fetches), sized to fill their container. */

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function PropertyEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <path d="M10 28 32 10l22 18" />
      <path d="M16 26v26h32V26" />
      <rect x="27" y="38" width="10" height="14" />
      <path d="M22 34h4v4h-4zM38 34h4v4h-4z" />
    </svg>
  )
}

export function RoomEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <rect x="12" y="12" width="40" height="40" rx="2" />
      <path d="M38 12v40" />
      <circle cx="34" cy="32" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TenantEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <circle cx="32" cy="22" r="10" />
      <path d="M12 52c2-12 12-18 20-18s18 6 20 18" />
    </svg>
  )
}

export function BillEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <path d="M18 8h28v48l-6-4-6 4-6-4-6 4-4-4z" />
      <path d="M24 22h16M24 30h16M24 38h10" />
    </svg>
  )
}

export function PaymentEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <rect x="8" y="18" width="48" height="30" rx="3" />
      <path d="M8 26h48" />
      <path d="M16 38h12" />
    </svg>
  )
}

export function ReceiptEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <path d="M16 6h32v52l-5-4-5 4-6-4-6 4-5-4-5 4V6z" transform="translate(0)" />
      <path d="M22 20h20M22 28h20M22 36h12" />
    </svg>
  )
}

export function SearchEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <circle cx="27" cy="27" r="15" />
      <path d="M38 38l14 14" />
    </svg>
  )
}

export function DocumentEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <path d="M16 6h22l10 10v42H16z" />
      <path d="M38 6v10h10" />
      <path d="M24 32h16M24 40h16M24 48h10" />
    </svg>
  )
}

export function ManagerEmptyIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" {...common} className={props.className}>
      <circle cx="24" cy="20" r="8" />
      <circle cx="42" cy="26" r="6" />
      <path d="M10 50c1.5-10 8-15 14-15s10.5 4 12 10c2-6 6-8 10-8 5 0 9 4 10 13" />
    </svg>
  )
}
