import 'server-only'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organization, membership, tickets, knowledgeBase, activityLog } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { headers, cookies } from 'next/headers'

const LEGACY_ORG_ID = 'org_default'
export const ACTIVE_ORG_COOKIE = 'active_org'

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  return (base || 'org') + '-' + Math.random().toString(36).slice(2, 6)
}

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

/**
 * Returns the caller's active organization id, derived SERVER-SIDE from the
 * authenticated session — never from client input.
 *
 * Resolution order:
 *   1. An explicitly selected org (cookie) the user is a member of.
 *   2. The user's first membership.
 *   3. Auto-provision a personal org on first use (and migrate any legacy
 *      `org_default` rows the user owns into it, so existing data stays
 *      private to them).
 */
// Wrapped in React's `cache()` so all callers within a single request share
// ONE execution — otherwise concurrent callers (layout, getTickets,
// getKnowledgeBase) each see "no membership" and each create a workspace.
export const getOrgId = cache(async function getOrgId(): Promise<string> {
  const userId = await getUserId()
  const cookieStore = await cookies()
  const activeCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  const memberships = await db
    .select({ orgId: membership.orgId })
    .from(membership)
    .where(eq(membership.userId, userId))

  if (activeCookie && memberships.some(m => m.orgId === activeCookie)) {
    return activeCookie
  }
  if (memberships[0]) return memberships[0].orgId

  // No org yet — provision a personal one and migrate legacy shared data.
  const session = await auth.api.getSession({ headers: await headers() })
  const orgId = crypto.randomUUID()
  await db.transaction(async tx => {
    // Serialize workspace provisioning per-user. `cache()` only dedupes within
    // a single request; concurrent requests for a brand-new user each bypass
    // it and would both win the race below. The advisory lock ensures only one
    // transaction at a time can reach the membership re-check for this user.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)

    // Re-check inside the transaction: a concurrent request may have already
    // created the user's personal workspace (or this very transaction, after
    // acquiring the lock, may find one created by a now-committed peer). If so,
    // discard ours.
    const existing = await tx
      .select({ orgId: membership.orgId })
      .from(membership)
      .where(eq(membership.userId, userId))
      .limit(1)
    if (existing[0]) return

    await tx.insert(organization).values({
      id: orgId,
      name: `${session?.user?.name || session?.user?.email || 'My'}'s Workspace`,
      slug: slugify(session?.user?.name || 'workspace'),
    })
    await tx.insert(membership).values({ userId, orgId, role: 'admin' })

    // Re-scope this user's legacy rows out of the shared bucket.
    await tx
      .update(tickets)
      .set({ orgId })
      .where(and(eq(tickets.userId, userId), eq(tickets.orgId, LEGACY_ORG_ID)))
    await tx
      .update(knowledgeBase)
      .set({ orgId })
      .where(and(eq(knowledgeBase.userId, userId), eq(knowledgeBase.orgId, LEGACY_ORG_ID)))
    await tx
      .update(activityLog)
      .set({ orgId })
      .where(and(eq(activityLog.userId, userId), eq(activityLog.orgId, LEGACY_ORG_ID)))
  })

  // Re-read membership so we return the already-existing org if a concurrent
  // request won the race and created it first.
  const after = await db
    .select({ orgId: membership.orgId })
    .from(membership)
    .where(eq(membership.userId, userId))
    .orderBy(membership.orgId)
    .limit(1)
  return after[0]?.orgId ?? orgId
})

/** Persist the user's selected active org (must be one they belong to). */
export async function setActiveOrg(orgId: string): Promise<void> {
  const userId = await getUserId()
  const ok = await db
    .select({ orgId: membership.orgId })
    .from(membership)
    .where(and(eq(membership.userId, userId), eq(membership.orgId, orgId)))
    .limit(1)
  if (!ok[0]) throw new Error('You are not a member of that organization')
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}