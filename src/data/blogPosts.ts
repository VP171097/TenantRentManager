/** Structured blog content — one object per post, rendered by BlogPage (list) and
 * BlogPostPage (detail). Keeping this as plain data (not MDX/markdown) means both
 * pages, the sitemap, and JSON-LD structured data all read from one source. */

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; text: string }

export interface BlogPost {
  slug: string
  title: string
  /** One-line summary used on the card, in <meta name="description">, and as the JSON-LD "description". */
  description: string
  date: string
  /** ISO 8601 date, used only for JSON-LD/meta — `date` above stays human-readable. */
  isoDate: string
  readTime: string
  category: string
  body: BlogBlock[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'electricity-billing-without-disputes',
    title: 'Electricity Billing Without the Monthly Dispute',
    description:
      'Most landlord-tenant friction over electricity comes from one thing: nobody can agree on the previous reading. Here is a simple system that ends the argument for good.',
    date: '2 September 2025',
    isoDate: '2025-09-02',
    readTime: '5 min read',
    category: 'Electricity Billing',
    body: [
      {
        type: 'p',
        text: "If you manage rented rooms in India, you already know the monthly ritual: you note a meter reading, work out the units consumed, multiply by your rate, and add it to the rent. It sounds simple, and it is — right up until a tenant asks \"why is this month's bill so much higher?\" and neither of you can say for certain what last month's reading actually was.",
      },
      { type: 'h2', text: 'The real problem is the gap, not the math' },
      {
        type: 'p',
        text: 'The multiplication is never where disputes come from. They come from gaps — a month where you didn\'t bill electricity separately, a tenant who moved rooms mid-cycle, a reading that was estimated instead of taken. Once one month\'s "previous reading" is uncertain, every month after it inherits the same uncertainty, compounding until a bill arrives that looks wrong even when it technically isn\'t.',
      },
      {
        type: 'callout',
        text: 'Rule of thumb: if you cannot show a tenant the exact reading their bill was calculated from, you cannot expect them to trust the bill.',
      },
      { type: 'h2', text: 'A reading log beats a bill log' },
      {
        type: 'p',
        text: 'The fix is to stop treating electricity as a line item on a bill and start treating it as its own ongoing record — a reading logged every single month, whether or not you actually bill for it that month. If a tenant is on a fixed arrangement some months, or you skip billing while sorting out a dispute, you still log the reading. That way the next real bill always has a true starting point to work from, instead of falling back to a guess.',
      },
      {
        type: 'list',
        items: [
          'Log a reading every month, even months you don\'t bill for — "skip and carry forward" instead of "skip and forget."',
          'Keep the reading log independent of the bill itself, so a corrected or edited bill never corrupts next month\'s starting point.',
          'Show the tenant both numbers — previous and current — on every bill, not just the units consumed.',
          'When a tenant moves rooms or moves out, take a reading on the spot rather than estimating it later.',
        ],
      },
      { type: 'h2', text: 'What this looks like in practice' },
      {
        type: 'p',
        text: 'In RentSlate, every electricity reading — billed or not — is its own record, tied to the tenant and the month. Generating a bill never guesses at a previous reading; it pulls the last one actually logged, no matter how many months back that was. The result is a system where "why is this bill higher" has a one-line, verifiable answer instead of a shrug.',
      },
    ],
  },
  {
    slug: 'rent-revisions-without-losing-trust',
    title: "A Landlord's Guide to Rent Revisions Without Losing Tenant Trust",
    description:
      'Raising the rent is normal. Doing it in a way that blindsides a tenant is what actually damages the relationship. A practical approach to revisions that keeps both sides on the same page.',
    date: '18 September 2025',
    isoDate: '2025-09-18',
    readTime: '4 min read',
    category: 'Tenant Management',
    body: [
      {
        type: 'p',
        text: 'Every landlord eventually revises rent — rising costs, market rates, a lease renewal. The revision itself rarely surprises a tenant; how it is communicated does. A rent that quietly changes on a bill, with no prior notice and no record of the old rate, reads as arbitrary even when it was planned months in advance.',
      },
      { type: 'h2', text: 'Treat every revision as a record, not an edit' },
      {
        type: 'p',
        text: 'The simplest mistake is overwriting the rent field the moment it changes. That erases the very thing a tenant might ask about later: "what was I paying before, and when did it change?" A rent revision should be additive — a new entry with an effective date, sitting alongside the history of every rate that came before it, not a silent replacement.',
      },
      {
        type: 'list',
        items: [
          'Record the effective date of a revision, not just the new amount — bills before that date should still reflect the old rate.',
          'Keep the full history visible to both you and the tenant, so "what was I paying in March?" has a real answer.',
          'Give notice before the revision takes effect — even a short written note avoids the sense of being blindsided.',
          'If a revision coincides with a lease renewal, record it as part of that renewal rather than a separate, unexplained change.',
        ],
      },
      { type: 'h2', text: 'Why this matters more than it seems to' },
      {
        type: 'p',
        text: "Tenants who trust the billing process rarely dispute a fair revision. Tenants who can't verify what changed and when will dispute almost anything — including charges that were entirely correct. A clean, dated history of rent revisions isn't bureaucracy for its own sake; it's the difference between a revision landing as routine and landing as a fight.",
      },
      {
        type: 'callout',
        text: "In RentSlate, every rent change is stored as its own dated revision against the tenant's record, so past bills always reflect the rate that actually applied at the time.",
      },
    ],
  },
  {
    slug: 'move-out-settlement-checklist',
    title: 'Move-Out Settlements: The Checklist Most Landlords Skip',
    description:
      "A tenant moving out is where the most disputes happen and the least process usually exists. Here's a settlement checklist that covers the details owners forget under time pressure.",
    date: '30 September 2025',
    isoDate: '2025-09-30',
    readTime: '5 min read',
    category: 'Move-Out & Settlement',
    body: [
      {
        type: 'p',
        text: "Move-in is unhurried — you have time to do it properly. Move-out almost never is. A tenant gives notice, the date arrives faster than planned, and settlement gets done in a rush: a final figure agreed verbally, a deposit refunded by transfer, and no record of how either number was actually reached.",
      },
      { type: 'h2', text: 'Three things a move-out settlement must capture' },
      {
        type: 'list',
        items: [
          'A final electricity reading taken on the day, not estimated from last month\'s bill.',
          'Any outstanding rent or charges up to the exact move-out date, not rounded to the nearest month.',
          'The deposit refund calculation, itemised — original deposit, deductions if any, and the net amount actually paid back.',
        ],
      },
      { type: 'h2', text: 'Why "we settled verbally" causes problems later' },
      {
        type: 'p',
        text: "A verbal settlement is fine right up until either side remembers it differently — which happens more often than landlords expect, usually weeks later when a tenant is disputing a deduction they don't recall agreeing to, or an owner can't explain why a refund was smaller than the deposit paid. A written, itemised settlement removes the ambiguity before it has a chance to become a disagreement.",
      },
      {
        type: 'callout',
        text: "If a room already has a bill generated for the month a tenant moves out, don't let that bill silently override the final settlement — the last reading and the final charges need to win, not the routine monthly one.",
      },
      { type: 'h2', text: 'A settlement is also a receipt' },
      {
        type: 'p',
        text: "The most useful move-out settlements double as a receipt — a record either side can point back to if a question comes up months later. That means keeping the final electricity charge, any outstanding balance, and the deposit refund together in one place, tied to the tenant's full history, rather than scattered across a chat thread and a bank transfer note.",
      },
      {
        type: 'p',
        text: "In RentSlate, move-out settlement is its own step: it lets you enter (or edit) the final reading, choose exactly what gets billed — rent, electricity, or both — and generates a clear settlement record alongside the deposit refund, so nothing about the final month is left to memory.",
      },
    ],
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}
