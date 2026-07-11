import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getKnowledgeBase } from '@/app/actions/kb'
import KnowledgeBaseList from '@/components/knowledge-base-list'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen } from 'lucide-react'

export const metadata = {
  title: 'DraftDesk — Knowledge Base',
  description: 'Manage knowledge base articles for AI-assisted responses',
}

export default async function KnowledgePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const kbItems = await getKnowledgeBase().catch(() => [])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Articles that ground your AI drafts.
          </p>
        </div>
        <Link href="/knowledge/new">
          <Button>
            <Plus className="size-4" /> New Article
          </Button>
        </Link>
      </header>

      {kbItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-primary/10">
            <BookOpen className="size-5 text-primary" />
          </div>
          <h3 className="text-base font-medium text-foreground">Your knowledge base is empty</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add articles so the AI can draft accurate, sourced replies. Start with FAQs, policies, or product docs.
          </p>
          <Link href="/knowledge/new" className="mt-4 inline-flex">
            <Button>Add your first article</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside>
            <KnowledgeBaseList items={kbItems} />
          </aside>
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Selected article</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose an article from the list to view and edit it.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}