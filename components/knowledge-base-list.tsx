'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteKnowledgeBase } from '@/app/actions/kb'
import { useState } from 'react'
import { useToast } from '@/components/toast'

interface KBItem {
  id: number
  title: string
  category?: string | null
  tags?: string | null
  createdAt: Date
  updatedAt: Date
}

export default function KnowledgeBaseList({ items }: { items: KBItem[] }) {
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this article?')) return
    setDeletingId(id)
    try {
      await deleteKnowledgeBase(id)
      toast({ kind: 'success', message: 'Article deleted.' })
    } catch {
      toast({ kind: 'error', message: 'Failed to delete article.' })
    } finally {
      setDeletingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <h3 className="text-base font-medium text-foreground">No articles yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first article to power AI drafts.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {items.map(item => (
        <li key={item.id}>
          <div className="group flex items-center gap-3 px-4 py-3 transition-fast hover:bg-muted/60">
            <Link href={`/knowledge/${item.id}/edit`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <div className="mt-1 flex items-center gap-2">
                {item.category && (
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{item.category}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(item.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              aria-label="Delete article"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}