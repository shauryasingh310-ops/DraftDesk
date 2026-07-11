import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import TicketForm from '@/components/ticket-form'

export const metadata = {
  title: 'DraftDesk — New Ticket',
  description: 'Create a support ticket',
}

export default async function NewTicketPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">New Ticket</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a ticket, then generate an AI draft grounded in your knowledge base.
        </p>
      </header>
      <TicketForm user={session.user} />
    </div>
  )
}