'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowLeft, Sparkles, Check, RotateCcw, Pencil, BookOpen, X, Loader2 } from 'lucide-react'
import { generateAiDraft, type AiDraftResult } from '@/app/actions/ai'
import { updateTicket, approveAiDraft, assignTicket, type OrgUser } from '@/app/actions/tickets'
import { useToast } from '@/components/toast'
import type { Ticket } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  needs_human_review: 'Needs Human Review',
  resolved: 'Resolved',
  closed: 'Closed',
}
const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}
const STATUS_DOT: Record<string, string> = {
  open: 'bg-status-open',
  in_progress: 'bg-status-progress',
  needs_human_review: 'bg-status-closed',
  resolved: 'bg-status-resolved',
  closed: 'bg-status-closed',
}

/** Parse "[Source 1] ..." references into clickable citation tokens. */
function renderDraft(text: string, onCite: (n: number) => void) {
  const parts = text.split(/(\[Source \d+\])/g)
  return parts.map((part, i) => {
    const m = part.match(/\[Source (\d+)\]/)
    if (m) {
      const n = parseInt(m[1])
      return (
        <button
          key={i}
          onClick={() => onCite(n)}
          className="mx-0.5 inline-flex size-4 translate-y-0.5 items-center justify-center rounded-sm bg-primary/10 align-super text-[10px] font-medium text-primary transition-fast hover:bg-primary/20"
          title={`View source ${n}`}
        >
          {n}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function confidenceBadge(confidence: number | null) {
  if (confidence === null) return null
  if (confidence >= 0.7) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-resolved/10 px-2.5 py-1 text-xs font-medium text-status-resolved">
        <BookOpen className="size-3" /> Strongly grounded
      </span>
    )
  }
  if (confidence >= 0.4) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-progress/10 px-2.5 py-1 text-xs font-medium text-status-progress">
        <BookOpen className="size-3" /> Partial match — review carefully
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-closed/10 px-2.5 py-1 text-xs font-medium text-status-closed">
      <BookOpen className="size-3" /> Weak match
    </span>
  )
}

export default function TicketDetail({
  ticket,
  userId,
  users,
}: {
  ticket: Ticket
  userId: string
  users: OrgUser[]
}) {
  const { toast } = useToast()
  const [current, setCurrent] = useState<Ticket>(ticket)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [responseText, setResponseText] = useState(current.finalResponse ?? '')
  const [drawer, setDrawer] = useState<number | null>(null)
  const [optimisticApproved, setOptimisticApproved] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result: AiDraftResult = await generateAiDraft(ticket.id)
      if (result.escalated) {
        setCurrent(prev => ({ ...prev, status: 'needs_human_review', confidence: result.confidence }))
        toast({
          kind: 'info',
          message: 'No strong match found in the knowledge base — this ticket needs a manual reply.',
        })
        return
      }
      setCurrent(prev => ({ ...prev, aiDraft: result.text ?? '', confidence: result.confidence }))
      toast({ kind: 'success', message: 'AI draft generated.' })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate draft.'
      toast({ kind: 'error', message })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = async () => {
    // Optimistic UI — instant feedback, rollback on error
    const prev = current
    setOptimisticApproved(true)
    setCurrent(c => ({ ...c, aiDraftApproved: true, finalResponse: c.aiDraft, status: 'resolved' }))
    try {
      await approveAiDraft(ticket.id)
      toast({
        kind: 'success',
        message: 'Draft approved. Ticket resolved.',
        action: {
          label: 'Undo',
          onClick: () => {
            setCurrent(prev)
            setOptimisticApproved(false)
            updateTicket(ticket.id, {
              aiDraftApproved: false,
              finalResponse: prev.finalResponse ?? undefined,
              status: prev.status,
            })
          },
        },
      })
    } catch {
      setCurrent(prev)
      setOptimisticApproved(false)
      toast({ kind: 'error', message: 'Failed to approve draft.' })
    }
  }

  const handleSaveResponse = async () => {
    try {
      await updateTicket(ticket.id, { finalResponse: responseText, status: 'resolved' })
      setCurrent(prev => ({ ...prev, finalResponse: responseText, status: 'resolved' }))
      setEditing(false)
      toast({ kind: 'success', message: 'Response saved. Ticket resolved.' })
    } catch {
      toast({ kind: 'error', message: 'Failed to save response.' })
    }
  }

  const handleAssign = async (assignedTo: string) => {
    const value = assignedTo === '' ? null : assignedTo
    const prev = current
    setCurrent(c => ({ ...c, assignedTo: value }))
    try {
      await assignTicket(ticket.id, value)
      toast({ kind: 'info', message: value ? 'Ticket assigned.' : 'Ticket unassigned.' })
    } catch {
      setCurrent(prev)
      toast({ kind: 'error', message: 'Failed to assign ticket.' })
    }
  }

  const isEscalated = current.status === 'needs_human_review'
  const hasDraft = !!current.aiDraft && !isEscalated

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      {/* Topbar controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/tickets"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-fast hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Inbox
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">{current.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', `text-priority-${current.priority}`)}>
            <span className={cn('size-2 rounded-full', STATUS_DOT[current.priority])} />
            {PRIORITY_LABEL[current.priority]}
          </span>
          <select
            value={current.status}
            onChange={async e => {
              const status = e.target.value as Ticket['status']
              setCurrent(prev => ({ ...prev, status }))
              try {
                await updateTicket(ticket.id, { status })
                toast({ kind: 'info', message: `Status set to ${STATUS_LABEL[status]}.` })
              } catch {
                toast({ kind: 'error', message: 'Failed to update status.' })
              }
            }}
            aria-label="Ticket status"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={current.assignedTo ?? ''}
            onChange={async e => handleAssign(e.target.value)}
            aria-label="Assign to"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Two-panel grid */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT — conversation thread */}
        <section className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Customer</h2>
            <p className="mt-1 text-sm text-muted-foreground">{current.customer}</p>
            <h2 className="mt-6 text-sm font-semibold text-foreground">Description</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{current.description}</p>
            <p className="mt-6 text-xs text-muted-foreground">
              Opened {new Date(current.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </p>
          </div>

          {current.finalResponse && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  You
                </span>
                <h2 className="text-sm font-semibold text-foreground">Response</h2>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{current.finalResponse}</p>
            </div>
          )}
        </section>

        {/* RIGHT — AI draft review (sticky) */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">AI Draft</h2>
              </div>
              {!current.aiDraft && !isEscalated && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50"
                >
                  {isGenerating && <Loader2 className="size-3.5 animate-spin" />}
                  {isGenerating ? 'Generating…' : 'Generate'}
                </button>
              )}
            </div>

            {isGenerating && (
              <div className="space-y-2 py-4">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-11/12 rounded bg-muted" />
                <div className="h-3 w-4/5 rounded bg-muted" />
                <p className="pt-2 text-xs text-muted-foreground">Searching knowledge base…</p>
              </div>
            )}

            {/* Escalated: no strong KB match */}
            {isEscalated && !current.aiDraft && (
              <div className="space-y-4">
                <div className="rounded-md border border-status-closed/30 bg-status-closed/5 p-4">
                  <p className="text-sm font-medium text-status-closed">
                    No strong match found in the knowledge base — this ticket needs a manual reply.
                  </p>
                  {current.confidence !== null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Retrieval confidence: {(current.confidence * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90"
                >
                  <Pencil className="size-3.5" /> Write your own reply instead
                </button>
              </div>
            )}

            {/* Draft present and not escalated */}
            {hasDraft && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {!optimisticApproved && !current.aiDraftApproved && confidenceBadge(current.confidence)}
                  {!optimisticApproved && !current.aiDraftApproved && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <BookOpen className="size-3" /> Grounded in sources
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {renderDraft(current.aiDraft!, setDrawer)}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {!current.aiDraftApproved && !optimisticApproved && (
                    <>
                      <button
                        onClick={handleApprove}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90"
                      >
                        <Check className="size-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setEditing(true)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-3 text-sm text-foreground transition-fast hover:bg-muted"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        onClick={handleGenerate}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-3 text-sm text-muted-foreground transition-fast hover:bg-muted hover:text-foreground"
                      >
                        <RotateCcw className="size-3.5" /> Regenerate
                      </button>
                      <button
                        onClick={() => setEditing(true)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-3 text-sm text-foreground transition-fast hover:bg-muted"
                      >
                        <Pencil className="size-3.5" /> Write your own reply instead
                      </button>
                    </>
                  )}
                  {(current.aiDraftApproved || optimisticApproved) && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-resolved">
                      <Check className="size-4" /> Approved
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Empty + not escalated + not generating */}
            {!isGenerating && !current.aiDraft && !isEscalated && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate a draft grounded in your knowledge base to respond in seconds.
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-input px-3 text-sm text-foreground transition-fast hover:bg-muted"
                >
                  <Pencil className="size-3.5" /> Write your own reply instead
                </button>
              </div>
            )}
          </div>

          {editing && (
            <div className="mt-4 rounded-lg border border-border bg-card p-6">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Write your own reply</h2>
              <textarea
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleSaveResponse}
                  className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90"
                >
                  Save & resolve
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex h-8 items-center rounded-md border border-input px-3 text-sm text-muted-foreground transition-fast hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Source drawer */}
      {drawer !== null && (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-black/30 animate-overlay-in"
          onClick={() => setDrawer(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 animate-panel-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Source {drawer}</h3>
              <button onClick={() => setDrawer(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Citation detail for source {drawer}. The draft referenced this knowledge base article.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}