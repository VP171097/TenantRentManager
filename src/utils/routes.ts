import { pageTitles } from './pageTitles'
/** Only legacy ROUTE hashes are migrated. Supabase token hashes are untouched. */
export function legacyRouteTarget(hash: string, base: string): string | null {
  if (!hash.startsWith('#/') || hash.startsWith('#//')) return null
  return `${base}${hash.slice(2)}`
}

export function migrateLegacyRoute() {
  const saved = sessionStorage.getItem('rentslate-route')
  if (saved) {
    sessionStorage.removeItem('rentslate-route')
    if (saved.startsWith(import.meta.env.BASE_URL) && !saved.startsWith('//')) window.history.replaceState(null, '', saved)
  }
  const target = legacyRouteTarget(window.location.hash, import.meta.env.BASE_URL)
  if (target) window.history.replaceState(null, '', target)
}

export function appUrl(path: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

export function routeTitle(path: string): string {
  return pageTitles[path] ?? pageTitles[`/${path.split('/')[1]}`] ?? 'Page Not Found · RentSlate'
}