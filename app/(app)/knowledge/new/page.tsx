import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import KnowledgeBaseForm from '@/components/knowledge-base-form'

export const metadata = {
  title: 'DraftDesk — New Article',
  description: 'Create a knowledge base article',
}

export default async function NewKnowledgeBasePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">New Article</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Write clear content — it will be chunked and embedded for AI search.
        </p>
      </header>
      <KnowledgeBaseForm />
    </div>
  )
}