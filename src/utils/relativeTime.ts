import { formatDistanceToNowStrict } from 'date-fns'

/** "2 hours ago" style relative timestamp, built on date-fns (already a
 * dependency) — used by the dashboard's activity feed. */
export function relativeTime(iso: string): string {
  try {
    return `${formatDistanceToNowStrict(new Date(iso))} ago`
  } catch {
    return ''
  }
}
