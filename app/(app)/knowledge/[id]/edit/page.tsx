import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getKnowledgeBaseItem } from '@/app/actions/kb'
import KnowledgeBaseForm from '@/components/knowledge-base-form'

export const metadata = {
  title: 'DraftDesk — Edit Article',
  description: 'Edit a knowledge base article',
}

export default async function EditKnowledgeBasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { id } = await params
  const itemId = parseInt(id)
  if (Number.isNaN(itemId)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Article not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The article you’re looking for doesn’t exist.</p>
      </div>
    )
  }
  const item = await getKnowledgeBaseItem(itemId)

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Article not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The article you’re looking for doesn’t exist.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Edit Article</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update the article content.</p>
      </header>
      <KnowledgeBaseForm initialData={item} />
    </div>
  )
}