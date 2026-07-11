import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ToastProvider } from '@/components/toast'
import { UiShell } from '@/app/ui-shell'
import { getTickets, getTicketById } from '@/app/actions/tickets'
import { getKnowledgeBase } from '@/app/actions/kb'
import { listMyOrgs } from '@/app/actions/org'
import { getOrgId } from '@/lib/org'
import type { PaletteTicket, PaletteArticle } from '@/components/command-palette'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  // Data for the global command palette (⌘K)
  const [tickets, articles, orgs, activeOrgId] = await Promise.all([
    getTickets().catch(() => []),
    getKnowledgeBase().catch(() => []),
    listMyOrgs().catch(() => []),
    getOrgId().catch(() => ''),
  ])

  const paletteTickets: PaletteTicket[] = tickets.map(t => ({
    id: t.id,
    title: t.title,
    customer: t.customer,
  }))
  const paletteArticles: PaletteArticle[] = articles.map(a => ({ id: a.id, title: a.title }))

  return (
    <ToastProvider>
      <UiShell
        tickets={paletteTickets}
        articles={paletteArticles}
        agentName={session.user.name}
        agentEmail={session.user.email}
        agentImage={session.user.image ?? ''}
        orgs={orgs}
        activeOrgId={activeOrgId}
      >
        {children}
      </UiShell>
    </ToastProvider>
  )
}
