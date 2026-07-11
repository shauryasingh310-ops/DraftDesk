import { getTickets } from '@/app/actions/tickets'
import TicketsList from '@/components/tickets-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
  title: 'SupportCopilot — Inbox',
  description: 'Triage support tickets with AI assistance',
}

export default async function TicketsPage() {
  const ticketsList = await getTickets().catch(() => [])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Triage tickets, approve AI drafts, and resolve faster.
          </p>
        </div>
        <Link href="/tickets/new">
          <Button>New Ticket</Button>
        </Link>
      </header>

      <TicketsList tickets={ticketsList} />
    </div>
  )
}