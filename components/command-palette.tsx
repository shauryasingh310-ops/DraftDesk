'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Search, Ticket, BookOpen, LayoutDashboard, Plus, CornerDownLeft } from 'lucide-react'

export interface PaletteTicket {
  id: number
  title: string
  customer: string
}
export interface PaletteArticle {
  id: number
  title: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  tickets: PaletteTicket[]
  articles: PaletteArticle[]
}

type Item =
  | { type: 'nav'; label: string; hint: string; icon: typeof Search; go: string }
  | { type: 'ticket'; id: number; label: string; sub: string; go: string }
  | { type: 'article'; id: number; label: string; go: string }

export function CommandPalette({ open, onClose, tickets, articles }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const nav: Item[] = [
      { type: 'nav', label: 'Go to Dashboard', hint: 'Overview', icon: LayoutDashboard, go: '/' },
      { type: 'nav', label: 'Go to Inbox', hint: 'Tickets', icon: Ticket, go: '/tickets' },
      { type: 'nav', label: 'Go to Knowledge Base', hint: 'Articles', icon: BookOpen, go: '/knowledge' },
      { type: 'nav', label: 'New Ticket', hint: 'Create', icon: Plus, go: '/tickets/new' },
    ]
    const ticketItems: Item[] = tickets.map(t => ({
      type: 'ticket',
      id: t.id,
      label: t.title,
      sub: t.customer,
      go: `/tickets/${t.id}`,
    }))
    const articleItems: Item[] = articles.map(a => ({
      type: 'article',
      id: a.id,
      label: a.title,
      go: `/knowledge/${a.id}/edit`,
    }))
    const all = [...nav, ...ticketItems, ...articleItems]
    if (!q) return all
    return all.filter(i =>
      i.label.toLowerCase().includes(q) || ('sub' in i && i.sub?.toLowerCase().includes(q)),
    )
  }, [query, tickets, articles])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  if (!open) return null

  const run = (item: Item) => {
    onClose()
    router.push(item.go)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[active]) run(items[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
      <div
        className="fixed inset-0 z-[90] flex items-start justify-center bg-black/30 px-4 pt-[12vh] animate-overlay-in"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="w-full max-w-[560px] overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-panel-in"
          onClick={e => e.stopPropagation()}
          onKeyDown={onKeyDown}
        >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tickets, articles, or jump to…"
            className="h-12 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-xs text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No results</li>
          )}
          {items.map((item, i) => {
            const Icon = 'icon' in item ? item.icon : item.type === 'ticket' ? Ticket : BookOpen
            return (
              <li key={`${item.type}-${'id' in item ? item.id : item.label}`}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-fast',
                    i === active ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate text-foreground">{item.label}</span>
                  {'sub' in item && item.sub && (
                    <span className="truncate text-xs text-muted-foreground">{item.sub}</span>
                  )}
                  {'hint' in item && item.hint && (
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  )}
                  {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
