import { getTickets } from '@/app/actions/tickets'
import { getKnowledgeBase } from '@/app/actions/kb'
import Link from 'next/link'
import { ArrowRight, Ticket as TicketIcon, Sparkles, CheckCircle2, BookOpen } from 'lucide-react'

export const metadata = {
  title: 'DraftDesk — Dashboard',
  description: 'Your support workspace at a glance',
}

const STATUS_DOT: Record<string, string> = {
  open: 'bg-status-open',
  in_progress: 'bg-status-progress',
  resolved: 'bg-status-resolved',
  closed: 'bg-status-closed',
}

export default async function DashboardPage() {
  const [tickets, articles] = await Promise.all([
    getTickets().catch(() => []),
    getKnowledgeBase().catch(() => []),
  ])

  const open = tickets.filter(t => t.status === 'open').length
  const awaiting = tickets.filter(t => t.aiDraft && !t.aiDraftApproved).length
  const resolvedToday = tickets.filter(
    t => t.status === 'resolved' && new Date(t.updatedAt ?? t.createdAt).toDateString() === new Date().toDateString(),
  ).length
  const recents = tickets.slice(0, 5)

  const stats = [
    { label: 'Open', value: open, icon: TicketIcon },
    { label: 'Awaiting review', value: awaiting, icon: Sparkles },
    { label: 'Resolved today', value: resolvedToday, icon: CheckCircle2 },
    { label: 'KB articles', value: articles.length, icon: BookOpen },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Here’s where your queue stands.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(s => {
          const StatIcon = s.icon
          const count = typeof s.value === 'number' ? s.value : 0
          return (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <StatIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="tabular mt-2 text-3xl font-semibold text-foreground">{count}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Continue working</h2>
            <Link href="/tickets" className="inline-flex items-center gap-1 text-sm text-primary transition-fast hover:text-primary/80">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {recents.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">No tickets yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first ticket to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {recents.map(t => (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 px-4 py-3 transition-fast hover:bg-muted/60">
                    <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[t.status] || 'bg-status-open'}`} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.customer}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">AI health</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Knowledge base indexed</span>
            </div>
            <p className="tabular mt-2 text-2xl font-semibold text-foreground">{articles.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {articles.length > 0
                ? 'Drafts will be grounded in your articles.'
                : 'Add articles to power accurate AI drafts.'}
            </p>
            <Link
              href="/knowledge"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm text-foreground transition-fast hover:bg-muted"
            >
              Manage articles <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}