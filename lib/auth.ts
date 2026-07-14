import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`[auth] Missing required env var: ${name}`)
  }
  return value
}

function resolveBaseURL() {
  const direct = process.env.BETTER_AUTH_URL
  if (direct && direct.trim()) return direct

  const vercelProj = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProj && vercelProj.trim()) return `https://${vercelProj}`

  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl && vercelUrl.trim()) return `https://${vercelUrl}`

  if (process.env.V0_RUNTIME_URL && process.env.V0_RUNTIME_URL.trim()) return process.env.V0_RUNTIME_URL

  // allow undefined in dev if desired, but in prod we want an explicit error
  return undefined
}

const baseURL = resolveBaseURL()
if (process.env.NODE_ENV === 'production') {
  requiredEnv('BETTER_AUTH_SECRET')
  requiredEnv('DATABASE_URL')
  if (!baseURL) {
    throw new Error('[auth] Could not resolve BETTER_AUTH_URL/baseURL in production')
  }
}

export const auth = betterAuth({
  database: pool,
  baseURL: baseURL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    // Also allow the baseURL we resolved (helps when env vars differ)
    ...(baseURL ? [baseURL] : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          // In dev (v0 preview iframe), force cross-site cookies so the
          // session cookie is stored by the browser.
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})

