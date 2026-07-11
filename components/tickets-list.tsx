'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Search, ArrowUpDown, Inbox } from 'lucide-react'
import type { Ticket } from '@/lib/types'

type Status = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed'
type Priority = 'all' | 'low' | 'medium' | 'high' | 'urgent'
type Sort = 'updated' | 'created' | 'priority'

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}
const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

const statusDot: Record<string, string> = {
  open: 'bg-status-open',
  in_progress: 'bg-status-progress',
  resolved: 'bg-status-resolved',
  closed: 'bg-status-closed',
}
const priorityChip: Record<string, string> = {
  low: 'text-priority-low',
  medium: 'text-priority-medium',
  high: 'text-priority-high',
  urgent: 'text-priority-urgent',
}

export function TicketRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3">
      <div className="size-2 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/3 rounded bg-muted" />
        <div className="h-3 w-1/4 rounded bg-muted" />
      </div>
      <div className="h-5 w-16 rounded-full bg-muted" />
      <div className="h-3 w-20 rounded bg-muted" />
    </div>
  )
}

export default function TicketsList({
  tickets,
  loading = false,
  error = null,
}: {
  tickets: Ticket[]
  loading?: boolean
  error?: string | null
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [priority, setPriority] = useState<Priority>('all')
  const [sort, setSort] = useState<Sort>('updated')
  const [selected, setSelected] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = tickets.filter(t => {
      if (status !== 'all' && t.status !== status) return false
      if (priority !== 'all' && t.priority !== priority) return false
      if (q && !(`${t.title} ${t.customer} ${t.description}`.toLowerCase().includes(q))) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      const da = sort === 'created' ? a.createdAt : a.updatedAt ?? a.createdAt
      const db = sort === 'created' ? b.createdAt : b.updatedAt ?? b.createdAt
      return new Date(db).getTime() - new Date(da).getTime()
    })
    return list
  }, [tickets, query, status, priority, sort])

  useEffect(() => {
    if (selected >= filtered.length) setSelected(0)
  }, [filtered.length, selected])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'j') {
        e.preventDefault()
        setSelected(s => Math.min(s + 1, filtered.length - 1))
      } else if (e.key === 'k') {
        e.preventDefault()
        setSelected(s => Math.max(s - 1, 0))
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Enter' && filtered[selected]) {
        e.preventDefault()
        router.push(`/tickets/${filtered[selected].id}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, selected, router])

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <h3 className="text-base font-medium text-foreground">Couldn’t load tickets</h3>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!loading && tickets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-muted">
          <Inbox className="size-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground">No tickets yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first ticket to start triaging with AI drafts.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tickets…  ( / )"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as Status)}
          aria-label="Filter by status"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as Priority)}
          aria-label="Filter by priority"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All priorities</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => setSort(s => (s === 'updated' ? 'created' : s === 'created' ? 'priority' : 'updated'))}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm text-muted-foreground transition-fast hover:text-foreground"
          title="Toggle sort"
        >
          <ArrowUpDown className="size-3.5" />
          {sort === 'updated' ? 'Updated' : sort === 'created' ? 'Created' : 'Priority'}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <TicketRowSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          No tickets match your filters.
        </div>
      ) : (
        <ul>
          {filtered.map((ticket, i) => (
            <li key={ticket.id}>
              <button
                onClick={() => router.push(`/tickets/${ticket.id}`)}
                onMouseEnter={() => setSelected(i)}
                className={cn(
                  'flex w-full items-center gap-4 border-b border-border px-4 py-3 text-left transition-fast last:border-b-0',
                  i === selected ? 'bg-muted' : 'hover:bg-muted/60',
                )}
              >
                <span className={cn('size-2 shrink-0 rounded-full', statusDot[ticket.status] || 'bg-status-open')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{ticket.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{ticket.customer}</p>
                </div>
                <span className={cn('shrink-0 text-xs font-medium', priorityChip[ticket.priority] || 'text-muted-foreground')}>
                  {PRIORITY_LABEL[ticket.priority] || ticket.priority}
                </span>
                 <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                   {new Date(ticket.updatedAt ?? ticket.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                 </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}