// Mirrors subset of web `src/lib/constants.ts` needed for the mobile onboarding flow.
// Keep these in sync with the web repo — they map directly to DB CHECK constraints.

export const DIAGNOSIS_CATEGORIES = [
  'Anxiety Disorders',
  'Depressive Disorders',
  'Bipolar Disorder',
  'Trauma & PTSD',
  'OCD & Hoarding',
  'ADHD',
  'Autism Spectrum Disorder',
  'Behavior Disorders (ODD)',
  'Personality Disorders',
  'Sleep Disorders',
  'Sexual Addiction & Porn',
  'RAD & Attachment Issues',
  'Substance Use Disorders',
  'Eating Disorders',
] as const

export const TREATMENT_MODALITIES = [
  'CBT','DBT','EMDR','Psychodynamic','Humanistic','ACT',
  'Motivational Interviewing','Solution-Focused','Narrative Therapy',
  'Gottman Method','EFT','IFS','Somatic Experiencing','Play Therapy',
  'Art Therapy','Group Therapy','Brainspotting','Neurofeedback',
  'Exposure & Response Prevention','Harm Reduction',
  'Psychedelic-Assisted Therapy','Psychedelic Integration',
  'Ketamine-Assisted Therapy','Neuropsychological Testing',
  'Psychological Testing','Psychoeducational Testing',
] as const

export const FOCUS_AREAS = [
  'Integrative/Functional','Sports & Performance','Psych/NeuroPsych Testing',
  'Psychoeducational Testing','Gaming','Ear Acupuncture/AcuDetox','EAP',
  'Disability/Workers Comp','Active Military','Veterans','Forensic/Legal',
  'Business Coaching','Premarital Counseling','Divorce/Custody/Mediation',
  'Foster/Adopt Services',
] as const

export const LICENSE_TYPES = [
  'Psychiatrist (MD, DO, MBBS)',
  'Psychologist (PhD, PsyD, MS, MA, LSSP)',
  'Physicians Assistant (PA, PA-C)',
  'Nurse Practitioner (DNP, PMHNP)',
  'LCSW','LCSW-S','LPC','LPC-S','LMFT','LMFT-S','LCDC','LCDC-S',
  'LMHC','BCBA','LSSP',
  'Speech-Language Pathologist (SLP)',
  'Audiologist (Au.D., Ph.D., Sc.D.)',
  'Registered Dietitian (RD)',
  'Acupuncturist (L.Ac)',
  'Occupational Therapist (OT)',
  'Other',
] as const

export const SUPERVISOR_ELIGIBLE = ['LCSW', 'LPC', 'LMFT'] as const

export const INSURANCE_PANELS = [
  'Aetna','Blue Cross Blue Shield','Cigna','United Healthcare','Humana',
  'Medicare','Medicaid','Tricare','Optum','Magellan','Anthem','Kaiser Permanente',
] as const

export const PRACTICE_SETTINGS = [
  'inpatient','php','iop','residential','wilderness','outpatient',
] as const

export const LANGUAGES = [
  'English','Spanish','French','Mandarin','Cantonese','Korean',
  'Vietnamese','Arabic','Hindi','Portuguese','Russian','Tagalog',
  'German','Japanese','ASL','Other',
] as const

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const

// ── Supporter sub-classification ──
// Matches User Type 3 spec — supporters are "anyone not licensed":
// trainees, students, non-clinicians.

export type SupporterSubtype = 'trainee' | 'student' | 'non_clinician'

export const SUPPORTER_SUBTYPE_OPTIONS: {
  id: SupporterSubtype
  label: string
  description: string
}[] = [
  {
    id: 'trainee',
    label: 'Trainee / Pre-Licensure',
    description: 'Professional or graduate student in medicine, nursing, social work',
  },
  {
    id: 'student',
    label: 'Student',
    description: 'Medicine, Nursing, Social Work, or Counseling',
  },
  {
    id: 'non_clinician',
    label: 'Non-Clinician',
    description: 'Educator, case manager, business development, or other',
  },
]

export const STUDENT_FIELDS = ['Medicine', 'Nursing', 'Social Work', 'Counseling'] as const
export const NON_CLINICIAN_ROLES = [
  'Teacher / Educator',
  'Case Manager / Discharge Planner',
  'Business Development / Marketer',
  'Other',
] as const

// ── Step order ──

export const CORE_STEPS = [
  'welcome',
  'phone_verify',
  'licensed_check',
  'profession_type',
  'license_type',
  'supervisor_check',
  'license_info',
  'npi_check',
  'practice_type',
  'practice_name',
  'practice_settings',
  'location',
  'telehealth',
  'hard_toggles',
  'insurance_panels',
  'session_rate',
  'diagnosis_weights',
  'modalities',
  'focus_areas',
  'languages',
  'bio',
  'photo',
  'complete',
] as const

export const AUXILIARY_STEPS = [
  'welcome',
  'phone_verify',
  'licensed_check',
  'profession_type',
  'license_info',
  'npi_check',
  'practice_type',
  'practice_name',
  'practice_settings',
  'location',
  'telehealth',
  'hard_toggles',
  'insurance_panels',
  'session_rate',
  'specialties',
  'languages',
  'bio',
  'photo',
  'complete',
] as const

// Supporters skip every clinician-only step. Just enough to populate a
// profile other clinicians can identify them by.
export const SUPPORTER_STEPS = [
  'welcome',
  'phone_verify',
  'licensed_check',
  'supporter_subtype',
  'supporter_detail',
  'location',
  'bio',
  'photo',
  'complete',
] as const

export type OnboardingStep =
  | (typeof CORE_STEPS)[number]
  | (typeof AUXILIARY_STEPS)[number]
  | (typeof SUPPORTER_STEPS)[number]

// `track` lets us pick the right step list for users who have answered
// the licensed_check question. null means undecided → default to CORE.
export type OnboardingTrack = 'core' | 'auxiliary' | 'supporter'

export function trackFor(opts: {
  isLicensed: boolean | null
  isAuxiliary: boolean
}): OnboardingTrack {
  if (opts.isLicensed === false) return 'supporter'
  if (opts.isAuxiliary) return 'auxiliary'
  return 'core'
}

export function stepsFor(track: OnboardingTrack): readonly OnboardingStep[] {
  if (track === 'supporter') return SUPPORTER_STEPS
  if (track === 'auxiliary') return AUXILIARY_STEPS
  return CORE_STEPS
}

export function stepIndex(step: OnboardingStep, track: OnboardingTrack): number {
  const list = stepsFor(track)
  const i = (list as readonly string[]).indexOf(step)
  return i < 0 ? 0 : i
}

export function totalSteps(track: OnboardingTrack): number {
  return stepsFor(track).length
}

export function nextStep(current: OnboardingStep, track: OnboardingTrack): OnboardingStep {
  const list = stepsFor(track)
  const i = (list as readonly string[]).indexOf(current)
  return list[Math.min(i + 1, list.length - 1)] as OnboardingStep
}

export function prevStep(current: OnboardingStep, track: OnboardingTrack): OnboardingStep {
  const list = stepsFor(track)
  const i = (list as readonly string[]).indexOf(current)
  return list[Math.max(i - 1, 0)] as OnboardingStep
}
