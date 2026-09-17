import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Calendar, Clock } from 'lucide-react'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'
import { BLOG_POSTS } from '../data/blogPosts'
import { appUrl } from '../utils/routes'

const JSON_LD_ID = 'blog-list-jsonld'

export function BlogPage() {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = JSON_LD_ID
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'RentSlate Blog',
      description: 'Practical guides on rent collection, electricity billing and tenant management for Indian landlords.',
      url: appUrl('/blog'),
      blogPost: BLOG_POSTS.map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        datePublished: post.isoDate,
        url: appUrl(`/blog/${post.slug}`),
      })),
    })
    document.head.appendChild(script)
    return () => { document.getElementById(JSON_LD_ID)?.remove() }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Blogs</p>
        <h1 className="mt-3 max-w-2xl text-4xl">Notes for landlords.</h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Practical guides on rent collection, electricity billing and tenant management — written from what
          actually comes up managing rented properties in India.
        </p>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              data-testid={`blog-card-${post.slug}`}
              className="card group flex flex-col justify-between transition hover:border-brand-400 hover:shadow-md dark:hover:border-brand-600"
            >
              <div>
                <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {post.category}
                </span>
                <h2 className="mt-4 text-xl font-semibold leading-snug text-slate-900 dark:text-slate-50">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {post.description}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {post.readTime}
                  </span>
                </span>
                <ArrowUpRight size={16} className="text-brand-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-brand-300" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Have a topic you'd like covered — a specific billing scenario, a compliance question, anything else?
          </p>
          <Link to="/contact" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-700 underline underline-offset-4 dark:text-brand-300">
            Tell us <ArrowRight size={15} />
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
