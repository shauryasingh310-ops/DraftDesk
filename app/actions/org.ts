'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organization, membership, chunks, tickets, knowledgeBase, activityLog } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { headers, cookies } from 'next/headers'
import { setActiveOrg, ACTIVE_ORG_COOKIE } from '@/lib/org'

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  return (base || 'org') + '-' + Math.random().toString(36).slice(2, 6)
}

export interface OrgSummary {
  id: string
  name: string
  slug: string
  role: string
}

/** List the organizations the current user belongs to. */
export async function listMyOrgs(): Promise<OrgSummary[]> {
  const userId = await getUserId()
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: membership.role,
    })
    .from(membership)
    .innerJoin(organization, eq(organization.id, membership.orgId))
    .where(eq(membership.userId, userId))
    .orderBy(organization.name)
  return rows
}

/** Create a new organization and join it as admin. */
export async function createOrganization(input: {
  name: string
  joinPass?: string
}): Promise<OrgSummary> {
  const userId = await getUserId()
  const name = input.name?.trim()
  if (!name) throw new Error('Organization name is required')

  const orgId = crypto.randomUUID()
  const slug = slugify(name)
  await db.insert(organization).values({
    id: orgId,
    name,
    slug,
    joinPass: input.joinPass?.trim() ? input.joinPass.trim() : null,
  })
  await db.insert(membership).values({ userId, orgId, role: 'admin' })
  await setActiveOrg(orgId)

  return { id: orgId, name, slug, role: 'admin' }
}

/**
 * Join an existing organization by its slug (from the org link / name) and
 * optional join pass.
 */
export async function joinOrganization(input: {
  identifier: string
  joinPass?: string
}): Promise<OrgSummary> {
  const userId = await getUserId()
  const identifier = input.identifier?.trim().toLowerCase()
  if (!identifier) throw new Error('Organization name or link is required')

  // Match by slug or by name (case-insensitive).
  const org = await db
    .select()
    .from(organization)
    .where(
      identifier.includes('-')
        ? eq(organization.slug, identifier)
        : eq(organization.name, identifier),
    )
    .limit(1)

  if (!org[0]) throw new Error('No organization found with that name or link')
  if (org[0].joinPass && org[0].joinPass !== (input.joinPass?.trim() ?? '')) {
    throw new Error('Incorrect join pass')
  }

  // Idempotent join (unique constraint guards duplicates).
  await db
    .insert(membership)
    .values({ userId, orgId: org[0].id, role: 'member' })
    .onConflictDoNothing()

  await setActiveOrg(org[0].id)

  return {
    id: org[0].id,
    name: org[0].name,
    slug: org[0].slug,
    role: 'member',
  }
}

/** Switch the active organization (must be one the user belongs to). */
export async function switchOrganization(orgId: string): Promise<void> {
  await setActiveOrg(orgId)
}

/**
 * Delete an organization the current user owns (admin). Only an admin may
 * delete, and the user's LAST remaining organization cannot be deleted — a
 * user must always have at least one workspace (it is auto-recreated on next
 * use otherwise). Cascades all tenant data via FKs / explicit deletes.
 */
export async function deleteOrganization(orgId: string): Promise<void> {
  const userId = await getUserId()

  const member = await db
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.userId, userId), eq(membership.orgId, orgId)))
    .limit(1)
  if (!member[0]) throw new Error('You are not a member of that organization')
  if (member[0].role !== 'admin') throw new Error('Only an admin can delete this organization')

  // Guard: never leave the user with zero organizations.
  const count = await db
    .select({ n: sql<number>`count(*)` })
    .from(membership)
    .where(eq(membership.userId, userId))
    .then(r => Number(r[0]?.n ?? 0))
  if (count <= 1) {
    throw new Error('You cannot delete your only organization. Create another one first if you want to remove this.')
  }

  // Delete all tenant data explicitly. Only `membership` has an FK cascade to
  // `organization`; tickets / knowledgeBase / activityLog / chunks reference
  // `orgId` with no cascade, so we remove them by hand to fully wipe the
  // workspace and avoid orphaned rows.
  await db.delete(chunks).where(eq(chunks.orgId, orgId))
  await db.delete(activityLog).where(eq(activityLog.orgId, orgId))
  await db.delete(knowledgeBase).where(eq(knowledgeBase.orgId, orgId))
  await db.delete(tickets).where(eq(tickets.orgId, orgId))
  await db.delete(organization).where(eq(organization.id, orgId))

  // If the deleted org was active, clear the cookie so the next request
  // re-resolves to the user's remaining (first) org.
  const cookieStore = await cookies()
  if (cookieStore.get(ACTIVE_ORG_COOKIE)?.value === orgId) {
    cookieStore.delete(ACTIVE_ORG_COOKIE)
  }
}
