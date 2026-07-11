'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { knowledgeBase, chunks, activityLog } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createKbEmbeddings } from './ai'
import { getOrgId } from '@/lib/org'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getKnowledgeBase() {
  const userId = await getUserId()
  const orgId = await getOrgId()

  return db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.orgId, orgId))
    .orderBy(desc(knowledgeBase.createdAt))
}

export async function getKnowledgeBaseItem(id: number) {
  await getUserId()
  const orgId = await getOrgId()

  const result = await db
    .select()
    .from(knowledgeBase)
    .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, orgId)))
    .limit(1)

  return result[0]
}

export async function createKnowledgeBase(data: {
  title: string
  content: string
  category?: string
  tags?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId()

  // Create KB article
  const result = await db
    .insert(knowledgeBase)
    .values({
      userId,
      orgId,
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags,
    })
    .returning()

  const kbId = result[0].id

  // Create embeddings (handled in separate action)
  try {
    await createKbEmbeddings(kbId)
  } catch (error) {
    console.error('[v0] Failed to create embeddings:', error)
    // Continue even if embeddings fail
  }

  // Log activity
  await db.insert(activityLog).values({
    userId,
    orgId,
    action: 'kb_created',
    metadata: JSON.stringify({ title: data.title, kbId }),
  })

  revalidatePath('/knowledge')
  return result[0]
}

export async function updateKnowledgeBase(
  id: number,
  data: {
    title?: string
    content?: string
    category?: string
    tags?: string
  }
) {
  const userId = await getUserId()
  const orgId = await getOrgId()

  // Update KB article
  const result = await db
    .update(knowledgeBase)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, orgId)))
    .returning()

  // If content changed, re-embed
  if (data.content) {
    try {
      await createKbEmbeddings(id)
    } catch (error) {
      console.error('[v0] Failed to re-embed content:', error)
    }
  }

  // Log activity
  await db.insert(activityLog).values({
    userId,
    orgId,
    action: 'kb_updated',
    metadata: JSON.stringify({ id, title: data.title }),
  })

  revalidatePath('/knowledge')
  revalidatePath(`/knowledge/${id}/edit`)
  return result[0]
}

export async function deleteKnowledgeBase(id: number) {
  const userId = await getUserId()
  const orgId = await getOrgId()

  // Delete chunks
  await db.delete(chunks).where(eq(chunks.kbId, id))

  // Delete KB article
  await db
    .delete(knowledgeBase)
    .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, orgId)))

  // Log activity
  await db.insert(activityLog).values({
    userId,
    orgId,
    action: 'kb_deleted',
    metadata: JSON.stringify({ id }),
  })

  revalidatePath('/knowledge')
}