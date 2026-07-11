'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { chunks, tickets, knowledgeBase } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateText } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { revalidatePath } from 'next/cache'
import { getOrgId } from '@/lib/org'

const DEFAULT_ORG_ID = 'org_default'

// ---------------------------------------------------------------------------
// Provider setup (OpenRouter, OpenAI-compatible)
// ---------------------------------------------------------------------------
const apiKey = process.env.OPENROUTER_API_KEY
const openrouter = createOpenAICompatible({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey ?? '',
})

// ---------------------------------------------------------------------------
// Model selection
//
// OpenRouter free-tier models are frequently rate-limited (HTTP 429) or, for
// some slugs, have no endpoints on a free key. We keep a curated list of
// slugs that actually exist on the free tier (verified against GET
// /api/v1/models) and walk it until one produces a draft. The env var
// OPENROUTER_MODEL, if set, is tried first.
// ---------------------------------------------------------------------------
const ENV_MODEL = process.env.OPENROUTER_MODEL?.trim()

const MODEL_CANDIDATES: string[] = [
  ...(ENV_MODEL ? [ENV_MODEL] : []),
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'tencent/hy3:free',
]

// A single model call must not hang forever. OpenRouter can be slow on the
// free tier, so allow a generous per-attempt ceiling.
const PER_ATTEMPT_TIMEOUT_MS = 25_000
const MAX_ATTEMPTS_PER_MODEL = 2
const BACKOFF_MS = 900

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

/** Transient failures worth retrying / falling through to another model. */
function isRetriable(error: unknown): boolean {
  const status = (error as { statusCode?: number })?.statusCode
  if (status === 429) return true
  if (typeof status === 'number' && status >= 500 && status < 600) return true
  const msg = error instanceof Error ? error.message : ''
  return /rate.?limit|provider returned error|429|timeout|timed out|aborted|503|502|500/i.test(msg)
}

// ---------------------------------------------------------------------------
// Knowledge retrieval
//
// OpenRouter does not serve embedding models, so vector RAG is disabled.
// Instead we use lexical retrieval: score every KB article by term-overlap
// with the ticket text (title + description + customer), keep the strongest
// matches, and feed their bodies to the model as the ONLY permitted context.
// This guarantees the draft is grounded in real article content rather than
// the model's general knowledge.
// ---------------------------------------------------------------------------
interface RetrievedChunk {
  text: string
  kbId: number
}

// Below this lexical-confidence score we consider the match too weak to draft
// from, and escalate the ticket to "needs_human_review". (Lexical proxy for
// cosine similarity, since OpenRouter serves no embedding models.)
const CONFIDENCE_THRESHOLD = 0.4

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
}

interface RetrievalResult {
  chunks: RetrievedChunk[]
  confidence: number // 0–1, normalized best-chunk term-overlap
}

async function searchSimilarChunks(
  query: string,
  customer: string,
  orgId: string,
): Promise<RetrievalResult> {
  // Pull all articles for the org. (KBs here are org-scoped, not user-scoped.)
  const articles = await db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.orgId, orgId))

  const qTerms = new Set(tokenize(`${query} ${customer}`))
  if (articles.length === 0 || qTerms.size === 0) return { chunks: [], confidence: 0 }

  const scored = articles.map(article => {
    const body = article.content ?? ''
    const haystack = tokenize(`${article.title} ${body}`)
    let overlap = 0
    for (const term of qTerms) {
      if (haystack.includes(term)) overlap++
    }
    // Title hits weigh more than body hits.
    const titleHits = tokenize(article.title).filter(t => qTerms.has(t)).length
    const score = overlap + titleHits * 2
    return { article, score }
  })

  // Keep articles with any overlap, best first, cap at 5.
  const top = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  // Confidence = matched query terms / total query terms, using the best
  // chunk's overlap (clamped to 1). Title hits count toward overlap too.
  const best = top[0]
  const bestOverlap = best
    ? best.score - tokenize(best.article.title).filter(t => qTerms.has(t)).length * 2
    : 0
  const confidence = Math.min(1, bestOverlap / qTerms.size)

  return {
    chunks: top.map(s => ({ kbId: s.article.id, text: s.article.content })),
    confidence,
  }
}

// ---------------------------------------------------------------------------
// Public: KB embedding hook (no-op on OpenRouter — kept for API stability)
// ---------------------------------------------------------------------------
export async function createKbEmbeddings(kbId: number) {
  const userId = await getUserId()

  const article = await db
    .select()
    .from(knowledgeBase)
    .where(and(eq(knowledgeBase.id, kbId), eq(knowledgeBase.userId, userId)))
    .limit(1)

  if (!article[0]) throw new Error('Knowledge base article not found')

  // Clear any stale chunks (embeddings are disabled on OpenRouter).
  await db.delete(chunks).where(eq(chunks.kbId, kbId))
}

// ---------------------------------------------------------------------------
// Public: generate an AI draft for a ticket
// ---------------------------------------------------------------------------
export interface AiDraftResult {
  text: string | null
  confidence: number
  escalated: boolean // true when no strong KB match → ticket set to needs_human_review
}

export async function generateAiDraft(ticketId: number): Promise<AiDraftResult> {
  const userId = await getUserId()
  const orgId = await getOrgId()

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to .env.local to enable AI drafts.',
    )
  }

  // Load the ticket (also validates it exists for this org).
  const ticket = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, orgId)))
    .limit(1)

  if (!ticket[0]) throw new Error('Ticket not found')

  // Lexical retrieval over the KB (vector RAG is disabled on OpenRouter).
  const { chunks: relevantChunks, confidence } = await searchSimilarChunks(
    `${ticket[0].title} ${ticket[0].description}`,
    ticket[0].customer,
    orgId,
  )

  // Escalate when retrieval is too weak — do NOT force a fabricated draft.
  if (relevantChunks.length === 0 || confidence < CONFIDENCE_THRESHOLD) {
    await db
      .update(tickets)
      .set({ status: 'needs_human_review', confidence, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId))
    revalidatePath(`/tickets/${ticketId}`)
    return { text: null, confidence, escalated: true }
  }

  // Build the grounding context. Each chunk is tagged [Source N] so the model
  // can (and must) cite exactly the text it relies on.
  const context = relevantChunks
    .map((chunk, idx) => `[Source ${idx + 1}] ${chunk.text}`)
    .join('\n\n')

  const systemPrompt = `You are a support agent drafting a reply to a customer's ticket. You have access to the company's knowledge base, provided below as numbered sources.

KNOWLEDGE BASE SOURCES:
${context}

STRICT GROUNDING RULES — you MUST follow these:
1. Only use information that is explicitly present in the KNOWLEDGE BASE SOURCES above.
2. Do NOT invent specific UI paths, menu names, button labels, settings names, URLs, or step-by-step instructions that are not stated verbatim (or clearly implied) in the sources.
3. When you state a fact from a source, cite it inline as [Source N] immediately after the sentence that uses it. Every claim must be traceable to a cited source; the cited source text must actually support the claim.
4. If the sources do NOT contain enough detail to answer precisely, say so honestly (for example: "Based on the available info the exact steps may vary — I'd recommend checking in Settings, or I can confirm the precise path for you"). Do NOT fill gaps with guessed specifics.

Keep the reply professional, concise (under 500 words), and written as if from the support agent.`

  const userPrompt = `
Customer: ${ticket[0].customer}
Subject: ${ticket[0].title}
Description: ${ticket[0].description}

Draft a response to this ticket following the grounding rules above.`

  let lastError: unknown
  let draft: string | undefined

  attemptLoop: for (const modelId of MODEL_CANDIDATES) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const { text } = await generateText({
          model: openrouter(modelId),
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.3,
          // Budget must be generous: some free models (e.g. gpt-oss) are
          // reasoning models and spend tokens on `reasoning` before `content`.
          maxOutputTokens: 1024,
          maxRetries: 0, // we handle retries/fallbacks ourselves
          abortSignal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS),
        })
        // Reasoning/small-context models can return an empty `content` if the
        // token budget was consumed by reasoning — treat that as a failure and
        // fall through to the next candidate model.
        if (!text || text.trim().length === 0) {
          lastError = new Error(`Model ${modelId} returned an empty draft`)
          if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
            await new Promise(r => setTimeout(r, BACKOFF_MS * (attempt + 1)))
          }
          continue
        }
        draft = text
        break attemptLoop
      } catch (error) {
        lastError = error
        if (!isRetriable(error)) break // non-transient (e.g. 4xx missing endpoint) → next model
        if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
          await new Promise(r => setTimeout(r, BACKOFF_MS * (attempt + 1)))
        }
      }
    }
  }

  if (draft === undefined) {
    const raw = lastError instanceof Error ? lastError.message : 'Failed to generate AI draft'
    const isRate = /rate.?limit|provider returned error|429|timeout|timed out|aborted/i.test(raw)
    const message = isRate
      ? 'The AI provider is rate-limiting or timing out on the free tier. Please retry in a moment, or set a non-free model via OPENROUTER_MODEL (e.g. openai/gpt-oss-120b).'
      : raw
    throw new Error(message)
  }

  // Persist the draft + confidence and refresh the ticket view.
  await db
    .update(tickets)
    .set({ aiDraft: draft, confidence, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))

  revalidatePath(`/tickets/${ticketId}`)
  return { text: draft, confidence, escalated: false }
}
