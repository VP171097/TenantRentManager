/** Cap on "list everything" queries (tenants, bills, payments, etc.) that
 * have no pagination UI yet — protects against an unbounded fetch on a
 * very large portfolio while staying generous enough that no real owner
 * hits it in normal use. Not a substitute for real pagination if usage
 * ever grows past this; just a safety net against runaway data pulls. */
export const LIST_QUERY_LIMIT = 1000
