import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTicketById, getUsers } from '@/app/actions/tickets'
import { getKnowledgeBaseItem } from '@/app/actions/kb'
import TicketDetail from '@/components/ticket-detail'
import type { Ticket } from '@/lib/types'

export const metadata = {
  title: 'DraftDesk — Ticket',
  description: 'View and resolve a ticket with AI-generated draft',
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { id } = await params
  const ticketId = parseInt(id)
  if (Number.isNaN(ticketId)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Ticket not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The ticket you’re looking for doesn’t exist.
        </p>
      </div>
    )
  }
  const ticket = await getTicketById(ticketId)

  if (!ticket) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Ticket not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The ticket you’re looking for doesn’t exist.
        </p>
      </div>
    )
  }

  const users = await getUsers()
  return <TicketDetail ticket={ticket as Ticket} userId={session.user.id} users={users} />
}