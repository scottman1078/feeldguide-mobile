import { supabase } from './supabase'

const API_BASE = 'https://www.feeldguide.com'

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiSignup(data: {
  email: string
  fullName: string
  // Phone is optional — collected on the verify-phone screen instead so
  // both signup paths (Google + email) funnel through the same step.
  phone?: string
  password: string
}) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function apiSendPhoneCode(phone: string) {
  const res = await fetch(`${API_BASE}/api/auth/verify-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  return res.json()
}

export async function apiCheckPhoneCode(phone: string, code: string) {
  const res = await fetch(`${API_BASE}/api/auth/check-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  })
  return res.json()
}

// Persist phone_verified=true on fg_profiles. Requires an active session
// because the route reads the user from the auth token.
export async function apiSavePhoneVerified(phone: string) {
  const headers = await authHeader()
  const res = await fetch(`${API_BASE}/api/auth/verify-phone/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ phone }),
  })
  return res.json()
}
