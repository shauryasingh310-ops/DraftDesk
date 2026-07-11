'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createTicket } from '@/app/actions/tickets'
import { useToast } from '@/components/toast'

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface TicketFormUser {
  name?: string | null
  email: string
}

export default function TicketForm({ user }: { user: TicketFormUser }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState('')
  // Pre-fill the customer with the signed-in agent's identity so the agent
  // is never asked to type their own name/email.
  const [customer, setCustomer] = useState(user.name || user.email || '')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<string>('medium')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !customer || !description) return
    setIsLoading(true)
    try {
      const ticket = await createTicket({ title, customer, description, priority })
      toast({ kind: 'success', message: 'Ticket created.' })
      router.push(`/tickets/${ticket.id}`)
    } catch {
      toast({ kind: 'error', message: 'Failed to create ticket.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium text-foreground">Title</label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required
            placeholder="Short summary of the issue" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="customer" className="mb-2 block text-sm font-medium text-foreground">
              Customer <span className="font-normal text-muted-foreground">(defaults to you)</span>
            </label>
            <input id="customer" type="text" value={customer} onChange={e => setCustomer(e.target.value)} required
              placeholder="Name or email" className={inputClass} />
          </div>
          <div>
            <label htmlFor="priority" className="mb-2 block text-sm font-medium text-foreground">Priority</label>
            <select id="priority" value={priority} onChange={e => setPriority(e.target.value)} className={inputClass}>
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium text-foreground">Description</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={10}
            placeholder="What does the customer need help with?" className={inputClass} />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={isLoading || !title || !customer || !description}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90 disabled:opacity-50">
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Create Ticket
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
