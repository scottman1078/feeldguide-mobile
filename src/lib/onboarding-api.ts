import { supabase } from './supabase'
import type { OnboardingData } from './onboarding-types'

const WEB_API = 'https://www.feeldguide.com'

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Persist the current onboarding step to fg_profiles for admin visibility. */
export async function saveStep(step: string): Promise<void> {
  try {
    const headers = await authHeader()
    await fetch(`${WEB_API}/api/onboarding/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ step }),
    })
  } catch {
    // non-fatal — step persistence is best-effort
  }
}

/** Submit the full onboarding payload; returns referral code on success. */
export async function submitOnboarding(
  data: OnboardingData,
  userEmail: string,
  userName: string
): Promise<{ referralCode: string }> {
  const headers = await authHeader()
  const isSupporter = data.isLicensed === false
  const userTier = isSupporter
    ? 'supporter'
    : data.isAuxiliary
      ? 'affiliate'
      : 'licensed'

  const res = await fetch(`${WEB_API}/api/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      email: userEmail,
      fullName: userName,
      phone: data.phone || null,
      phoneVerified: data.phoneVerified,
      userTier,
      // Supporter sub-classification (only sent when supporter)
      supporterSubtype: isSupporter ? data.supporterSubtype : null,
      supporterDetail: isSupporter ? data.supporterDetail : null,
      // Clinician-only fields — null/empty for supporters so a re-onboarding
      // from a switched tier doesn't carry stale data.
      professionId: isSupporter ? null : (data.professionId || null),
      isAuxiliary: isSupporter ? false : data.isAuxiliary,
      licenseType: isSupporter ? '' : data.licenseType,
      isSupervisor: isSupporter ? false : data.isSupervisor,
      licenseNumber: isSupporter ? '' : data.licenseNumber,
      licenseState: isSupporter ? '' : data.licenseState,
      npiNumber: isSupporter ? null : (data.npiNumber || null),
      verificationPath: isSupporter ? '' : (data.verificationPath || 'license'),
      npiVerified: isSupporter ? false : data.npiVerified,
      vouchCode: isSupporter ? null : (data.vouchCode || null),
      voucherId: isSupporter ? null : (data.voucherId || null),
      practiceType: isSupporter ? '' : data.practiceType,
      practiceName: isSupporter ? '' : data.practiceName,
      practiceSettings: isSupporter ? [] : data.practiceSettings,
      city: data.city,
      state: data.state,
      zip: data.zip,
      telehealthAvailable: isSupporter ? false : data.telehealthAvailable,
      acceptingNewClients: isSupporter ? false : data.acceptingNewClients,
      directPay: isSupporter ? false : data.directPay,
      acceptsInsurance: isSupporter ? false : data.acceptsInsurance,
      insurancePanels: isSupporter ? [] : data.insurancePanels,
      sessionRateMin:
        isSupporter || !data.sessionRateMin ? null : parseInt(data.sessionRateMin, 10),
      sessionRateMax:
        isSupporter || !data.sessionRateMax ? null : parseInt(data.sessionRateMax, 10),
      diagnosisWeights: isSupporter || data.isAuxiliary ? {} : data.diagnosisWeights,
      modalities: isSupporter || data.isAuxiliary ? [] : data.modalities,
      focusAreas: isSupporter || data.isAuxiliary ? [] : data.focusAreas,
      selectedSpecialtyIds:
        !isSupporter && data.isAuxiliary ? data.selectedSpecialtyIds : [],
      customSpecialties:
        !isSupporter && data.isAuxiliary ? data.customSpecialties : [],
      languages: isSupporter ? [] : data.languages,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      videoIntroUrl: null,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to save profile')
  }
  return { referralCode: json.referralCode || '' }
}

/** Look up a profession's specialties (for auxiliary flow). */
export async function fetchProfessionSpecialties(
  professionId: string
): Promise<Array<{ id: string; name: string }>> {
  const { data } = await supabase
    .from('fg_profession_specialties')
    .select('id, name')
    .eq('profession_id', professionId)
    .order('sort_order', { ascending: true })
  return (data || []) as Array<{ id: string; name: string }>
}

/** Fetch all professions (needed for profession_type step). */
export async function fetchProfessions(): Promise<
  Array<{ id: string; full_name: string; abbreviation: string; is_auxiliary: boolean; sort_order: number }>
> {
  const { data } = await supabase
    .from('fg_professions')
    .select('id, full_name, abbreviation, is_auxiliary, sort_order')
    .order('sort_order', { ascending: true })
  return (data || []) as Array<{ id: string; full_name: string; abbreviation: string; is_auxiliary: boolean; sort_order: number }>
}
