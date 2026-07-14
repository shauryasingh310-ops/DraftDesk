# TODO - Fix production sign-up/sign-in (better-auth 500)

- [ ] Add production-safe error payload to `app/api/auth/[...all]/route.ts` so 500 returns JSON details.
- [ ] Add explicit runtime checks in auth config (`lib/auth.ts`) for required env vars (DATABASE_URL, BETTER_AUTH_SECRET, baseURL/VERCEL vars) and throw clear errors.
- [ ] Align `lib/auth-client.ts` baseURL with server baseURL and fail fast if `NEXT_PUBLIC_BETTER_AUTH_URL` is missing in production.
- [ ] Rebuild + redeploy.
- [ ] Trigger sign-up/sign-in and confirm the network response shows the real underlying error.
- [ ] If DB-related, run the required better-auth migrations / ensure tables exist in production.
