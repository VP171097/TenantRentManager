import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { appUrl, routeTitle } from '../utils/routes'
import { getBlogPost } from '../data/blogPosts'

export function RouteMetadata() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = routeTitle(pathname)
    const blogSlug = pathname.startsWith('/blog/') ? pathname.slice('/blog/'.length) : null
    const blogPost = blogSlug ? getBlogPost(blogSlug) : undefined
    const isPublicContent = pathname === '/' || pathname === '/blog' || blogPost
    const description = pathname === '/'
      ? 'RentSlate helps Indian landlords manage rent collections, electricity readings, tenants and receipts in one organised place.'
      : pathname === '/blog'
        ? 'Practical guides on rent collection, electricity billing and tenant management for Indian landlords.'
        : blogPost
          ? blogPost.description
          : `${routeTitle(pathname).split(' · ')[0]}. Sign in securely to access your RentSlate account.`
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', isPublicContent ? 'index,follow' : 'noindex,nofollow')
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', appUrl(pathname))
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', appUrl(pathname))
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}