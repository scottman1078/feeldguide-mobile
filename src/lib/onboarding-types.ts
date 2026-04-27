import type { SupporterSubtype } from './onboarding-constants'

export interface OnboardingData {
  phone: string
  normalizedPhone: string
  phoneVerified: boolean

  // Set by the licensed_check step. null means not yet answered.
  isLicensed: boolean | null
  supporterSubtype: SupporterSubtype | ''
  supporterDetail: string

  professionId: string
  professionName: string
  isAuxiliary: boolean

  licenseType: string
  isSupervisor: boolean
  licenseNumber: string
  licenseState: string

  npiNumber: string
  verificationPath: 'npi' | 'license' | 'vouch' | ''
  npiVerified: boolean
  vouchCode: string
  voucherId: string

  practiceType: 'Solo' | 'Group' | 'Combination' | ''
  practiceName: string
  practiceSettings: string[]

  city: string
  state: string
  zip: string
  telehealthAvailable: boolean

  acceptingNewClients: boolean
  directPay: boolean
  acceptsInsurance: boolean
  insurancePanels: string[]

  sessionRateMin: string
  sessionRateMax: string

  diagnosisWeights: Record<string, number>
  modalities: string[]
  focusAreas: string[]
  selectedSpecialtyIds: string[]
  customSpecialties: string[]
  languages: string[]

  bio: string
  avatarUrl: string
}

export function createInitialOnboardingData(
  diagnosisCategories: readonly string[]
): OnboardingData {
  return {
    phone: '',
    normalizedPhone: '',
    phoneVerified: false,
    isLicensed: null,
    supporterSubtype: '',
    supporterDetail: '',
    professionId: '',
    professionName: '',
    isAuxiliary: false,
    licenseType: '',
    isSupervisor: false,
    licenseNumber: '',
    licenseState: '',
    npiNumber: '',
    verificationPath: '',
    npiVerified: false,
    vouchCode: '',
    voucherId: '',
    practiceType: '',
    practiceName: '',
    practiceSettings: [],
    city: '',
    state: '',
    zip: '',
    telehealthAvailable: true,
    acceptingNewClients: true,
    directPay: false,
    acceptsInsurance: false,
    insurancePanels: [],
    sessionRateMin: '',
    sessionRateMax: '',
    diagnosisWeights: Object.fromEntries(diagnosisCategories.map((c) => [c, 50])),
    modalities: [],
    focusAreas: [],
    selectedSpecialtyIds: [],
    customSpecialties: [],
    languages: ['English'],
    bio: '',
    avatarUrl: '',
  }
}
