// Pre-launch waitlist gate (mirrors web/src/middleware.ts).
// When WAITLIST_MODE is on, post-onboarding users land on /waitlist instead of
// the dashboard. Admins + emails in the bypass list skip the gate.

export const WAITLIST_MODE =
  process.env.EXPO_PUBLIC_WAITLIST_MODE === 'true'

const BYPASS_EMAILS = (process.env.EXPO_PUBLIC_WAITLIST_BYPASS_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean)

export function isWaitlistBypassEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return BYPASS_EMAILS.includes(email.toLowerCase())
}

export function shouldHoldOnWaitlist(opts: {
  email: string | null | undefined
  isAdmin: boolean
}): boolean {
  if (!WAITLIST_MODE) return false
  if (opts.isAdmin) return false
  if (isWaitlistBypassEmail(opts.email)) return false
  return true
}
