import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

const handler = toNextJsHandler(auth.handler)

async function logError(req: Request, e: unknown) {
  console.error('[auth] request failed:', {
    url: req.url,
    method: req.method,
    error: e instanceof Error ? e.stack || e.message : e,
    databaseUrlSet: !!process.env.DATABASE_URL,
    betterAuthSecretSet: !!process.env.BETTER_AUTH_SECRET,
    nodeEnv: process.env.NODE_ENV,
  })
}

export const GET = async (req: Request) => {
  try {
    return await handler.GET(req)
  } catch (e) {
    await logError(req, e)
    return new Response(
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500 },
    )
  }
}

export const POST = async (req: Request) => {
  try {
    return await handler.POST(req)
  } catch (e) {
    await logError(req, e)
    return new Response(
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500 },
    )
  }
}
