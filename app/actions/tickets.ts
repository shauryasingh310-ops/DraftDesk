'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tickets, knowledgeBase, chunks, activityLog, user, membership } from '@/lib/db/schema'
import { and, eq, desc, or, ilike, type SQL } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getOrgId } from '@/lib/org'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getTickets(
  status?: string,
  priority?: string,
  search?: string
) {
  const userId = await getUserId()
  const orgId = await getOrgId()

  const base = eq(tickets.orgId, orgId)
  const extra: SQL[] = []
  if (status) extra.push(eq(tickets.status, status))
  if (priority) extra.push(eq(tickets.priority, priority))
  if (search) {
    extra.push(
      or(
        ilike(tickets.title, `%${search}%`),
        ilike(tickets.description, `%${search}%`),
        ilike(tickets.customer, `%${search}%`)
      )!
    )
  }

  const where = extra.length ? and(base, ...extra) : base

  return db
    .select()
    .from(tickets)
    .where(where)
    .orderBy(desc(tickets.createdAt))
}

export async function getTicketById(id: number) {
  await getUserId()
  const orgId = await getOrgId()

  const result = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, id), eq(tickets.orgId, orgId)))
    .limit(1)

  return result[0]
}

export async function createTicket(data: {
  title: string
  description: string
  customer: string
  priority?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId()

  const result = await db
    .insert(tickets)
    .values({
      userId,
      orgId,
      title: data.title,
      description: data.description,
      customer: data.customer,
      priority: data.priority || 'medium',
      status: 'open',
    })
    .returning()

  // Log activity
  if (result[0]) {
    await db.insert(activityLog).values({
      userId,
      orgId,
      action: 'ticket_created',
      ticketId: result[0].id,
      metadata: JSON.stringify({ title: data.title }),
    })
  }

  revalidatePath('/tickets')
  return result[0]
}

export async function updateTicket(
  id: number,
  data: Partial<{
    status: string
    priority: string
    assignedAgent: string
    assignedTo: string | null
    aiDraft: string
    aiDraftApproved: boolean
    finalResponse: string
  }>
) {
  const userId = await getUserId()
  const orgId = await getOrgId()

  const result = await db
    .update(tickets)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(tickets.id, id), eq(tickets.orgId, orgId)))
    .returning()

  // Log activity
  if (result[0]) {
    await db.insert(activityLog).values({
      userId,
      orgId,
      action: 'ticket_updated',
      ticketId: id,
      metadata: JSON.stringify({ changes: data }),
    })
  }

  revalidatePath('/tickets')
  revalidatePath(`/tickets/${id}`)
  return result[0]
}

// Assign/reassign a ticket to a specific agent (or unassign with null).
export async function assignTicket(id: number, assignedTo: string | null) {
  const userId = await getUserId()
  const orgId = await getOrgId()

  const result = await db
    .update(tickets)
    .set({ assignedTo, updatedAt: new Date() })
    .where(and(eq(tickets.id, id), eq(tickets.orgId, orgId)))
    .returning()

  if (result[0]) {
    await db.insert(activityLog).values({
      userId,
      orgId,
      action: 'ticket_assigned',
      ticketId: id,
      metadata: JSON.stringify({ assignedTo }),
    })
  }

  revalidatePath('/tickets')
  revalidatePath(`/tickets/${id}`)
  return result[0]
}

export async function approveAiDraft(id: number) {
  const userId = await getUserId()
  const orgId = await getOrgId()

  const result = await db
    .update(tickets)
    .set({
      aiDraftApproved: true,
      finalResponse: (await db.select({ draft: tickets.aiDraft }).from(tickets).where(and(eq(tickets.id, id), eq(tickets.orgId, orgId))).limit(1))[0]?.draft,
      status: 'resolved',
      updatedAt: new Date(),
    })
    .where(and(eq(tickets.id, id), eq(tickets.orgId, orgId)))
    .returning()

  if (result[0]) {
    await db.insert(activityLog).values({
      userId,
      orgId,
      action: 'ai_draft_approved',
      ticketId: id,
    })
  }

  revalidatePath(`/tickets/${id}`)
  return result[0]
}

export async function searchKnowledgeBase(query: string, limit: number = 5) {
  await getUserId()
  const orgId = await getOrgId()

  // Simple text search first (for MVP)
  return db
    .select()
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.orgId, orgId),
        or(
          ilike(knowledgeBase.title, `%${query}%`),
          ilike(knowledgeBase.content, `%${query}%`)
        )
      )
    )
    .limit(limit)
}

export interface OrgUser {
  id: string
  name: string
  email: string
}

// List users in the caller's organization (for assignment dropdown).
export async function getUsers(): Promise<OrgUser[]> {
  await getUserId()
  const orgId = await getOrgId()
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .innerJoin(membership, eq(membership.userId, user.id))
    .where(eq(membership.orgId, orgId))
    .orderBy(user.name)
  return rows
}