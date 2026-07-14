import { createAuthClient } from 'better-auth/react'

function resolveClientBaseURL() {
  if (typeof window !== 'undefined') {
    // Prefer explicit public base URL (recommended for production)
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? window.location.origin
  }
  // In server components (if any), only env can be used
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL
}

const baseURL = resolveClientBaseURL()

if (process.env.NODE_ENV === 'production' && !baseURL) {
  throw new Error('[auth-client] Missing NEXT_PUBLIC_BETTER_AUTH_URL in production')
}

export const authClient = createAuthClient({
  baseURL,
})

export const { signIn, signUp, signOut, useSession } = authClient

