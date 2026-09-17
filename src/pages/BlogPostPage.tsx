import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'
import { BLOG_POSTS, getBlogPost, type BlogBlock } from '../data/blogPosts'
import { appUrl } from '../utils/routes'

const JSON_LD_ID = 'blog-post-jsonld'

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="mt-10 text-2xl font-semibold text-slate-900 dark:text-slate-50">{block.text}</h2>
    case 'list':
      return (
        <ul className="mt-4 space-y-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400" />
              {item}
            </li>
          ))}
        </ul>
      )
    case 'callout':
      return (
        <div className="mt-6 rounded-xl border-l-4 border-brand-600 bg-brand-50 px-5 py-4 text-sm leading-relaxed text-brand-900 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-100">
          {block.text}
        </div>
      )
    case 'p':
    default:
      return <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">{block.text}</p>
  }
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? getBlogPost(slug) : undefined

  useEffect(() => {
    if (!post) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = JSON_LD_ID
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.isoDate,
      author: { '@type': 'Organization', name: 'RentSlate' },
      publisher: { '@type': 'Organization', name: 'RentSlate' },
      mainEntityOfPage: appUrl(`/blog/${post.slug}`),
      url: appUrl(`/blog/${post.slug}`),
    })
    document.head.appendChild(script)
    return () => { document.getElementById(JSON_LD_ID)?.remove() }
  }, [post])

  if (!post) return <Navigate to="/blog" replace />

  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell max-w-3xl py-20">
        <Link to="/blog" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">
          <ArrowLeft size={15} /> All blogs
        </Link>

        <span className="mt-6 inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {post.category}
        </span>
        <h1 className="mt-4 text-4xl leading-tight">{post.title}</h1>
        <div className="mt-5 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} /> {post.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {post.readTime}
          </span>
        </div>

        <article className="mt-10 border-t border-slate-200 pt-10 dark:border-slate-800">
          {post.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </article>

        <div className="mt-16 rounded-2xl bg-brand-800 p-8 text-white">
          <h3 className="text-xl font-semibold">Ready to put this into practice?</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-100">
            RentSlate handles readings, revisions and settlements exactly the way this guide describes — no
            spreadsheet required.
          </p>
          <Link to="/login?mode=signup" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50">
            Get started for free <ArrowRight size={15} />
          </Link>
        </div>

        {otherPosts.length > 0 && (
          <div className="mt-16">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">More from the blog</h3>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {otherPosts.map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="card transition hover:border-brand-400 hover:shadow-md dark:hover:border-brand-600"
                >
                  <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{p.category}</span>
                  <h4 className="mt-2 text-base font-semibold leading-snug text-slate-900 dark:text-slate-50">{p.title}</h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}
