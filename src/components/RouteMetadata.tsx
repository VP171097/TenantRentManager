import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { appUrl, routeTitle } from '../utils/routes'

export function RouteMetadata() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = routeTitle(pathname)
    const description = pathname === '/'
      ? 'RentBook helps Indian landlords manage rent collections, electricity readings, tenants and receipts in one organised place.'
      : `${routeTitle(pathname).split(' · ')[0]}. Sign in securely to access your RentBook account.`
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', pathname === '/' ? 'index,follow' : 'noindex,nofollow')
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', appUrl(pathname))
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', appUrl(pathname))
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}