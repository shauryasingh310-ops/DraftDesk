'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createKnowledgeBase, updateKnowledgeBase } from '@/app/actions/kb'
import { useToast } from '@/components/toast'

interface KBItem {
  id: number
  title: string
  content: string
  category?: string | null
  tags?: string | null
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function KnowledgeBaseForm({ initialData }: { initialData?: KBItem }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [category, setCategory] = useState(initialData?.category || '')
  const [tags, setTags] = useState(initialData?.tags || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) return
    setIsLoading(true)
    try {
      if (initialData) {
        await updateKnowledgeBase(initialData.id, { title, content, category, tags })
        toast({ kind: 'success', message: 'Article updated and re-indexed.' })
      } else {
        await createKnowledgeBase({ title, content, category, tags })
        toast({ kind: 'success', message: 'Article created and indexed.' })
      }
      router.push('/knowledge')
      router.refresh()
    } catch {
      toast({ kind: 'error', message: 'Failed to save article.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium text-foreground">
            Title
          </label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required
            placeholder="Article title" className={inputClass} />
        </div>

        <div>
          <label htmlFor="content" className="mb-2 block text-sm font-medium text-foreground">
            Content
          </label>
          <textarea id="content" value={content} onChange={e => setContent(e.target.value)} required rows={12}
            placeholder="Article content. This will be chunked and embedded for AI search." className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="mb-2 block text-sm font-medium text-foreground">
              Category (optional)
            </label>
            <input id="category" type="text" value={category} onChange={e => setCategory(e.target.value)}
              placeholder="e.g., Billing" className={inputClass} />
          </div>
          <div>
            <label htmlFor="tags" className="mb-2 block text-sm font-medium text-foreground">
              Tags (optional)
            </label>
            <input id="tags" type="text" value={tags} onChange={e => setTags(e.target.value)}
              placeholder="e.g., refund, payment" className={inputClass} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isLoading || !title || !content}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50">
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {initialData ? 'Update Article' : 'Create Article'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm text-muted-foreground transition-fast hover:bg-muted">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}