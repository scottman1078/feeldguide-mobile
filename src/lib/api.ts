const API_BASE = 'https://www.feeldguide.com'

export async function apiSignup(data: {
  email: string
  fullName: string
  phone: string
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
