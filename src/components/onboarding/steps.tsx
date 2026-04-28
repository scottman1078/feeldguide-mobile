import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Slider from '@react-native-community/slider'
import { colors } from '../../lib/colors'
import { supabase } from '../../lib/supabase'
import { Pill, CardChoice, ToggleRow, Input, StepHeader, NavFooter } from './primitives'
import { fetchProfessions, fetchProfessionSpecialties } from '../../lib/onboarding-api'
import {
  LICENSE_TYPES,
  US_STATES,
  PRACTICE_SETTINGS,
  INSURANCE_PANELS,
  DIAGNOSIS_CATEGORIES,
  TREATMENT_MODALITIES,
  FOCUS_AREAS,
  LANGUAGES,
  SUPERVISOR_ELIGIBLE,
  SUPPORTER_SUBTYPE_OPTIONS,
  STUDENT_FIELDS,
  NON_CLINICIAN_ROLES,
  type OnboardingStep,
  type SupporterSubtype,
} from '../../lib/onboarding-constants'
import type { OnboardingData } from '../../lib/onboarding-types'

// ═══════════════════════════════════════════════════════════
// Step renderer — dispatches to the right component per step
// ═══════════════════════════════════════════════════════════

interface StepProps {
  data: OnboardingData
  setData: (fn: (prev: OnboardingData) => OnboardingData) => void
  advance: () => void
  back: () => void
}

export function StepContent({ step, ...props }: StepProps & { step: OnboardingStep }) {
  switch (step) {
    case 'welcome': return <WelcomeStep {...props} />
    case 'phone_verify': return <PhoneVerifyStep {...props} />
    case 'licensed_check': return <LicensedCheckStep {...props} />
    case 'supporter_subtype': return <SupporterSubtypeStep {...props} />
    case 'supporter_detail': return <SupporterDetailStep {...props} />
    case 'profession_type': return <ProfessionTypeStep {...props} />
    case 'license_type': return <LicenseTypeStep {...props} />
    case 'supervisor_check': return <SupervisorCheckStep {...props} />
    case 'license_info': return <LicenseInfoStep {...props} />
    case 'npi_check': return <NpiCheckStep {...props} />
    case 'practice_type': return <PracticeTypeStep {...props} />
    case 'practice_name': return <PracticeNameStep {...props} />
    case 'practice_settings': return <PracticeSettingsStep {...props} />
    case 'location': return <LocationStep {...props} />
    case 'telehealth': return <TelehealthStep {...props} />
    case 'hard_toggles': return <HardTogglesStep {...props} />
    case 'insurance_panels': return <InsurancePanelsStep {...props} />
    case 'session_rate': return <SessionRateStep {...props} />
    case 'diagnosis_weights': return <DiagnosisWeightsStep {...props} />
    case 'modalities': return <ModalitiesStep {...props} />
    case 'focus_areas': return <FocusAreasStep {...props} />
    case 'specialties': return <SpecialtiesStep {...props} />
    case 'languages': return <LanguagesStep {...props} />
    case 'bio': return <BioStep {...props} />
    case 'photo': return <PhotoStep {...props} />
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// Individual step components
// ═══════════════════════════════════════════════════════════

function WelcomeStep({ advance }: StepProps) {
  return (
    <View>
      <StepHeader
        title="Welcome to FeeldGuide"
        subtitle="Let's build your referral profile. This takes about 5 minutes. You can come back to finish later."
      />
      <NavFooter onContinue={advance} continueLabel="Let's go" showBack={false} />
    </View>
  )
}

function PhoneVerifyStep({ data, advance }: StepProps) {
  // Signup flow already sent an OTP to this number. If already verified we just
  // confirm; otherwise we give them a "Resend code" shortcut.
  const verified = data.phoneVerified
  return (
    <View>
      <StepHeader
        title="Phone verification"
        subtitle={
          verified
            ? 'Your phone is verified. Continue to build your profile.'
            : `We sent a code to ${data.phone || 'your phone'}. Re-verify if needed from your sign-in flow.`
        }
      />
      <NavFooter
        onContinue={advance}
        continueLabel={verified ? 'Continue' : 'Skip for now'}
        showBack={false}
      />
    </View>
  )
}

function LicensedCheckStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader
        title="Are you a licensed clinician?"
        subtitle="This sets you up with the right account type. Supporters (students, trainees, non-clinicians) get a stripped-down browse-and-message experience — no clinician-only features."
      />
      <CardChoice
        title="Yes, I'm licensed"
        subtitle="Full clinician account with referrals, marketplace, TrustScore"
        selected={data.isLicensed === true}
        onPress={() => {
          setData((prev) => ({
            ...prev,
            isLicensed: true,
            // Clear supporter selections in case user toggled
            supporterSubtype: '' as SupporterSubtype | '',
            supporterDetail: '',
          }))
          advance()
        }}
      />
      <CardChoice
        title="No, I'm not licensed"
        subtitle="Supporter account — browse the network, message clinicians"
        selected={data.isLicensed === false}
        onPress={() => {
          setData((prev) => ({
            ...prev,
            isLicensed: false,
            isAuxiliary: false,
          }))
          advance()
        }}
      />
      <NavFooter
        onBack={back}
        onContinue={advance}
        continueLabel="Continue"
        continueDisabled={data.isLicensed === null}
      />
    </View>
  )
}

function SupporterSubtypeStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader
        title="Which best describes you?"
        subtitle="Pick the closest match — you can update it later in Settings."
      />
      {SUPPORTER_SUBTYPE_OPTIONS.map((opt) => (
        <CardChoice
          key={opt.id}
          title={opt.label}
          subtitle={opt.description}
          selected={data.supporterSubtype === opt.id}
          onPress={() =>
            setData((prev) => ({ ...prev, supporterSubtype: opt.id, supporterDetail: '' }))
          }
        />
      ))}
      <NavFooter
        onBack={back}
        onContinue={advance}
        continueLabel="Continue"
        continueDisabled={!data.supporterSubtype}
      />
    </View>
  )
}

function SupporterDetailStep({ data, setData, advance, back }: StepProps) {
  // Trainees skip detail — they shouldn't actually land here, but be defensive.
  if (data.supporterSubtype === 'trainee') {
    return (
      <View>
        <StepHeader title="No further info needed" subtitle="Tap continue to keep going." />
        <NavFooter onBack={back} onContinue={advance} continueLabel="Continue" />
      </View>
    )
  }

  if (data.supporterSubtype === 'student') {
    return (
      <View>
        <StepHeader title="Which field?" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {STUDENT_FIELDS.map((f) => (
            <Pill
              key={f}
              label={f}
              selected={data.supporterDetail === f}
              onPress={() => setData((prev) => ({ ...prev, supporterDetail: f }))}
            />
          ))}
        </View>
        <NavFooter
          onBack={back}
          onContinue={advance}
          continueLabel="Continue"
          continueDisabled={!data.supporterDetail}
        />
      </View>
    )
  }

  // non_clinician — picker + free-text "Other"
  const isOther = data.supporterDetail.startsWith('Other:')
  const otherValue = data.supporterDetail.replace(/^Other:\s*/, '')

  return (
    <View>
      <StepHeader title="What best describes your role?" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {NON_CLINICIAN_ROLES.map((role) => {
          const selected =
            data.supporterDetail === role || (role === 'Other' && isOther)
          return (
            <Pill
              key={role}
              label={role}
              selected={selected}
              onPress={() => {
                if (role === 'Other') {
                  setData((prev) => ({ ...prev, supporterDetail: 'Other:' }))
                } else {
                  setData((prev) => ({ ...prev, supporterDetail: role }))
                }
              }}
            />
          )
        })}
      </View>
      {isOther && (
        <View style={{ marginTop: 12 }}>
          <Input
            value={otherValue}
            onChangeText={(v) => setData((prev) => ({ ...prev, supporterDetail: `Other: ${v}` }))}
            placeholder="Tell us your role"
          />
        </View>
      )}
      <NavFooter
        onBack={back}
        onContinue={advance}
        continueLabel="Continue"
        continueDisabled={
          !data.supporterDetail ||
          data.supporterDetail === 'Other:' ||
          (isOther && !otherValue.trim())
        }
      />
    </View>
  )
}

function ProfessionTypeStep({ data, setData, advance }: StepProps) {
  const [professions, setProfessions] = useState<
    Array<{ id: string; full_name: string; abbreviation: string; is_auxiliary: boolean }>
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfessions().then((list) => {
      setProfessions(list)
      setLoading(false)
    })
  }, [])

  const core = professions.filter((p) => !p.is_auxiliary)
  const auxiliary = professions.filter((p) => p.is_auxiliary)

  return (
    <View>
      <StepHeader
        title="What's your profession?"
        subtitle="This shapes what you see and how colleagues find you."
      />
      {loading ? (
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      ) : (
        <>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4, marginBottom: 8 }}>
            MENTAL HEALTH CLINICIANS
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {core.map((p) => (
              <Pill
                key={p.id}
                label={p.abbreviation || p.full_name}
                selected={data.professionId === p.id}
                onPress={() =>
                  setData((prev) => ({
                    ...prev,
                    professionId: p.id,
                    professionName: p.full_name,
                    isAuxiliary: false,
                  }))
                }
              />
            ))}
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 16, marginBottom: 8 }}>
            ALLIED HEALTH PROFESSIONALS
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {auxiliary.map((p) => (
              <Pill
                key={p.id}
                label={p.abbreviation || p.full_name}
                selected={data.professionId === p.id}
                onPress={() =>
                  setData((prev) => ({
                    ...prev,
                    professionId: p.id,
                    professionName: p.full_name,
                    isAuxiliary: true,
                  }))
                }
              />
            ))}
          </View>
        </>
      )}
      <NavFooter onContinue={advance} continueDisabled={!data.professionId} />
    </View>
  )
}

function LicenseTypeStep({ data, setData, advance, back }: StepProps) {
  const [professions, setProfessions] = useState<
    Array<{ id: string; full_name: string; abbreviation: string; is_auxiliary: boolean }>
  >([])

  useEffect(() => {
    fetchProfessions().then(setProfessions).catch(() => {})
  }, [])

  const options = professions.length > 0
    ? professions.map((p) => p.abbreviation)
    : (LICENSE_TYPES as readonly string[])

  return (
    <View>
      <StepHeader title="License type" subtitle="Pick the credential you practice under." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {options.map((t) => (
          <Pill
            key={t}
            label={t}
            selected={data.licenseType === t}
            onPress={() => setData((prev) => ({ ...prev, licenseType: t }))}
          />
        ))}
      </View>
      <NavFooter onBack={back} onContinue={advance} continueDisabled={!data.licenseType} />
    </View>
  )
}

function SupervisorCheckStep({ data, setData, advance, back }: StepProps) {
  const eligible = SUPERVISOR_ELIGIBLE.some((s) => data.licenseType?.startsWith(s))
  useEffect(() => {
    if (!eligible) advance()
  }, [eligible, advance])
  if (!eligible) return null
  return (
    <View>
      <StepHeader title="Are you a supervisor?" subtitle="We'll add the -S credential suffix if so." />
      <CardChoice
        title="Yes, I'm a clinical supervisor"
        onPress={() => {
          setData((prev) => {
            const base = prev.licenseType.replace(/-S$/, '')
            return { ...prev, licenseType: `${base}-S`, isSupervisor: true }
          })
          advance()
        }}
        selected={data.isSupervisor}
      />
      <CardChoice
        title="No, just providing care"
        onPress={() => {
          setData((prev) => ({ ...prev, isSupervisor: false }))
          advance()
        }}
        selected={!data.isSupervisor && !!data.licenseType}
      />
      <NavFooter onBack={back} onContinue={advance} />
    </View>
  )
}

function LicenseInfoStep({ data, setData, advance, back }: StepProps) {
  const [stateOpen, setStateOpen] = useState(false)
  return (
    <View>
      <StepHeader title="License number & state" subtitle="Needed for license verification." />
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
        License number
      </Text>
      <Input
        value={data.licenseNumber}
        onChangeText={(v) => setData((prev) => ({ ...prev, licenseNumber: v }))}
        placeholder="123456789"
        autoCapitalize="characters"
      />
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 16, marginBottom: 6 }}>
        State of license
      </Text>
      <TouchableOpacity
        onPress={() => setStateOpen((v) => !v)}
        style={{
          paddingHorizontal: 14, paddingVertical: 14, borderRadius: 10,
          borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
        }}
      >
        <Text style={{ fontSize: 15, color: data.licenseState ? colors.textPrimary : colors.textMuted }}>
          {data.licenseState || 'Select a state'}
        </Text>
      </TouchableOpacity>
      {stateOpen && (
        <View style={{ marginTop: 8, maxHeight: 260, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }}>
          <ScrollView>
            {US_STATES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  setData((prev) => ({ ...prev, licenseState: s }))
                  setStateOpen(false)
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 14 }}
              >
                <Text style={{ fontSize: 15, color: colors.textPrimary }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <NavFooter
        onBack={back}
        onContinue={advance}
        continueDisabled={!data.licenseNumber || !data.licenseState}
      />
    </View>
  )
}

function NpiCheckStep({ data, setData, advance, back }: StepProps) {
  const [loading, setLoading] = useState(false)

  async function verifyNpi() {
    if (data.npiNumber.length !== 10) return
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const res = await fetch('https://www.feeldguide.com/api/verify-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ npiNumber: data.npiNumber, licenseType: data.licenseType }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.verified) {
        setData((prev) => ({ ...prev, npiVerified: true, verificationPath: 'npi' }))
        advance()
      } else {
        Alert.alert('NPI not found', 'We couldn\'t match that NPI to your license. You can use vouch or skip.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <StepHeader title="Verify your credentials" subtitle="Pick one method. NPI is fastest." />
      <CardChoice
        title="NPI number (fastest)"
        subtitle="Auto-verify against the national registry"
        selected={data.verificationPath === 'npi'}
        onPress={() => setData((prev) => ({ ...prev, verificationPath: 'npi' }))}
      />
      <CardChoice
        title="Vouch code"
        subtitle="A colleague already on FeeldGuide gave you one"
        selected={data.verificationPath === 'vouch'}
        onPress={() => setData((prev) => ({ ...prev, verificationPath: 'vouch' }))}
      />
      <CardChoice
        title="Manual license review"
        subtitle="We'll verify within 48h"
        selected={data.verificationPath === 'license'}
        onPress={() => setData((prev) => ({ ...prev, verificationPath: 'license' }))}
      />

      {data.verificationPath === 'npi' && (
        <View style={{ marginTop: 12 }}>
          <Input
            value={data.npiNumber}
            onChangeText={(v) => setData((prev) => ({ ...prev, npiNumber: v.replace(/\D/g, '').slice(0, 10) }))}
            placeholder="10-digit NPI"
            keyboardType="numeric"
          />
        </View>
      )}
      {data.verificationPath === 'vouch' && (
        <View style={{ marginTop: 12 }}>
          <Input
            value={data.vouchCode}
            onChangeText={(v) => setData((prev) => ({ ...prev, vouchCode: v.toUpperCase().replace(/\s/g, '') }))}
            placeholder="VOUCH-CODE"
            autoCapitalize="characters"
          />
        </View>
      )}

      <NavFooter
        onBack={back}
        onContinue={data.verificationPath === 'npi' ? verifyNpi : advance}
        continueLabel={data.verificationPath === 'npi' ? 'Verify & continue' : 'Continue'}
        continueDisabled={
          (data.verificationPath === 'npi' && data.npiNumber.length !== 10) ||
          (data.verificationPath === 'vouch' && data.vouchCode.length < 4) ||
          !data.verificationPath
        }
        continueLoading={loading}
      />
    </View>
  )
}

function PracticeTypeStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader title="Solo, group, or both?" />
      {(['Solo', 'Group', 'Combination'] as const).map((t) => (
        <CardChoice
          key={t}
          title={t === 'Combination' ? 'A combination of both' : `${t} practice`}
          selected={data.practiceType === t}
          onPress={() => setData((prev) => ({ ...prev, practiceType: t }))}
        />
      ))}
      <NavFooter onBack={back} onContinue={advance} continueDisabled={!data.practiceType} />
    </View>
  )
}

function PracticeNameStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader
        title="Practice name"
        subtitle="Skip if you're solo and don't have a practice name."
      />
      <Input
        value={data.practiceName}
        onChangeText={(v) => setData((prev) => ({ ...prev, practiceName: v }))}
        placeholder="e.g. Bridgeway Psychological Group"
      />
      <NavFooter
        onBack={back}
        onContinue={advance}
        onSkip={() => { setData((prev) => ({ ...prev, practiceName: '' })); advance() }}
      />
    </View>
  )
}

function PracticeSettingsStep({ data, setData, advance, back }: StepProps) {
  const toggle = (s: string) => {
    setData((prev) => ({
      ...prev,
      practiceSettings: prev.practiceSettings.includes(s)
        ? prev.practiceSettings.filter((x) => x !== s)
        : [...prev.practiceSettings, s],
    }))
  }
  const LABELS: Record<string, string> = {
    inpatient: 'Inpatient', php: 'PHP', iop: 'IOP',
    residential: 'Residential', wilderness: 'Wilderness', outpatient: 'Outpatient',
  }
  return (
    <View>
      <StepHeader title="Which settings do you work in?" subtitle="Pick all that apply." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {PRACTICE_SETTINGS.map((s) => (
          <Pill key={s} label={LABELS[s] ?? s} selected={data.practiceSettings.includes(s)} onPress={() => toggle(s)} />
        ))}
      </View>
      <NavFooter
        onBack={back}
        onContinue={advance}
        continueDisabled={data.practiceSettings.length === 0}
      />
    </View>
  )
}

function LocationStep({ data, setData, advance, back }: StepProps) {
  const [stateOpen, setStateOpen] = useState(false)
  return (
    <View>
      <StepHeader title="Where are you based?" />
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>City</Text>
      <Input
        value={data.city}
        onChangeText={(v) => setData((prev) => ({ ...prev, city: v }))}
        placeholder="Austin"
      />
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 14, marginBottom: 6 }}>State</Text>
      <TouchableOpacity
        onPress={() => setStateOpen((v) => !v)}
        style={{
          paddingHorizontal: 14, paddingVertical: 14, borderRadius: 10,
          borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
        }}
      >
        <Text style={{ fontSize: 15, color: data.state ? colors.textPrimary : colors.textMuted }}>
          {data.state || 'Select a state'}
        </Text>
      </TouchableOpacity>
      {stateOpen && (
        <View style={{ marginTop: 8, maxHeight: 220, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }}>
          <ScrollView>
            {US_STATES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  setData((prev) => ({ ...prev, state: s }))
                  setStateOpen(false)
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 14 }}
              >
                <Text style={{ fontSize: 15, color: colors.textPrimary }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 14, marginBottom: 6 }}>
        ZIP (optional)
      </Text>
      <Input
        value={data.zip}
        onChangeText={(v) => setData((prev) => ({ ...prev, zip: v.replace(/\D/g, '').slice(0, 5) }))}
        placeholder="78704"
        keyboardType="numeric"
      />
      <NavFooter
        onBack={back}
        onContinue={advance}
        continueDisabled={!data.city || !data.state}
      />
    </View>
  )
}

function TelehealthStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader title="Do you offer telehealth?" />
      <CardChoice
        title="Yes, telehealth available"
        selected={data.telehealthAvailable === true}
        onPress={() => { setData((prev) => ({ ...prev, telehealthAvailable: true })); advance() }}
      />
      <CardChoice
        title="In-person only"
        selected={data.telehealthAvailable === false}
        onPress={() => { setData((prev) => ({ ...prev, telehealthAvailable: false })); advance() }}
      />
      <NavFooter onBack={back} onContinue={advance} />
    </View>
  )
}

function HardTogglesStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader
        title="Practice logistics"
        subtitle="These feed directly into search filters."
      />
      <ToggleRow
        label="Accepting new clients"
        value={data.acceptingNewClients}
        onChange={(v) => setData((prev) => ({ ...prev, acceptingNewClients: v }))}
      />
      <ToggleRow
        label="Direct pay (private pay / self-pay)"
        value={data.directPay}
        onChange={(v) => setData((prev) => ({ ...prev, directPay: v }))}
      />
      <ToggleRow
        label="Accepts insurance"
        value={data.acceptsInsurance}
        onChange={(v) => setData((prev) => ({ ...prev, acceptsInsurance: v }))}
      />
      <NavFooter onBack={back} onContinue={advance} />
    </View>
  )
}

function InsurancePanelsStep({ data, setData, advance, back }: StepProps) {
  useEffect(() => {
    if (!data.acceptsInsurance) advance()
  }, [data.acceptsInsurance, advance])
  if (!data.acceptsInsurance) return null
  const toggle = (p: string) => {
    setData((prev) => ({
      ...prev,
      insurancePanels: prev.insurancePanels.includes(p)
        ? prev.insurancePanels.filter((x) => x !== p)
        : [...prev.insurancePanels, p],
    }))
  }
  return (
    <View>
      <StepHeader title="Which insurance panels?" subtitle="Pick all you're paneled with." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {INSURANCE_PANELS.map((p) => (
          <Pill key={p} label={p} selected={data.insurancePanels.includes(p)} onPress={() => toggle(p)} />
        ))}
      </View>
      <NavFooter onBack={back} onContinue={advance} continueDisabled={data.insurancePanels.length === 0} />
    </View>
  )
}

function SessionRateStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader title="Session rate range" subtitle="Self-pay rate per session. Roughly — you can refine later." />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Min</Text>
          <Input
            value={data.sessionRateMin}
            onChangeText={(v) => setData((prev) => ({ ...prev, sessionRateMin: v.replace(/\D/g, '') }))}
            placeholder="$150"
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Max</Text>
          <Input
            value={data.sessionRateMax}
            onChangeText={(v) => setData((prev) => ({ ...prev, sessionRateMax: v.replace(/\D/g, '') }))}
            placeholder="$225"
            keyboardType="numeric"
          />
        </View>
      </View>
      <NavFooter
        onBack={back}
        onContinue={advance}
        continueDisabled={!data.sessionRateMin && !data.sessionRateMax}
      />
    </View>
  )
}

function DiagnosisWeightsStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader
        title="Diagnosis affinity"
        subtitle="How much do you love treating each one? 0 = never work with, 100 = love it."
      />
      {DIAGNOSIS_CATEGORIES.map((cat) => {
        const value = data.diagnosisWeights[cat] ?? 50
        const color = value >= 70 ? colors.teal : value <= 30 ? '#ef4444' : '#94a3b8'
        return (
          <View key={cat} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{cat}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color }}>{value}</Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={value}
              minimumTrackTintColor={colors.teal}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.teal}
              onValueChange={(v) =>
                setData((prev) => ({ ...prev, diagnosisWeights: { ...prev.diagnosisWeights, [cat]: Math.round(v) } }))
              }
            />
          </View>
        )
      })}
      <NavFooter onBack={back} onContinue={advance} />
    </View>
  )
}

function ModalitiesStep({ data, setData, advance, back }: StepProps) {
  const toggle = (m: string) =>
    setData((prev) => ({
      ...prev,
      modalities: prev.modalities.includes(m) ? prev.modalities.filter((x) => x !== m) : [...prev.modalities, m],
    }))
  return (
    <View>
      <StepHeader title="Treatment modalities" subtitle="Pick all you use regularly." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {TREATMENT_MODALITIES.map((m) => (
          <Pill key={m} label={m} selected={data.modalities.includes(m)} onPress={() => toggle(m)} />
        ))}
      </View>
      <NavFooter onBack={back} onContinue={advance} continueDisabled={data.modalities.length === 0} />
    </View>
  )
}

function FocusAreasStep({ data, setData, advance, back }: StepProps) {
  const toggle = (a: string) =>
    setData((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(a) ? prev.focusAreas.filter((x) => x !== a) : [...prev.focusAreas, a],
    }))
  return (
    <View>
      <StepHeader title="Focus areas" subtitle="Specialties beyond your core modality." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {FOCUS_AREAS.map((a) => (
          <Pill key={a} label={a} selected={data.focusAreas.includes(a)} onPress={() => toggle(a)} />
        ))}
      </View>
      <NavFooter onBack={back} onContinue={advance} />
    </View>
  )
}

function SpecialtiesStep({ data, setData, advance, back }: StepProps) {
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([])
  const [customInput, setCustomInput] = useState('')

  useEffect(() => {
    if (data.professionId) {
      fetchProfessionSpecialties(data.professionId).then(setOptions)
    }
  }, [data.professionId])

  const toggle = (id: string) =>
    setData((prev) => ({
      ...prev,
      selectedSpecialtyIds: prev.selectedSpecialtyIds.includes(id)
        ? prev.selectedSpecialtyIds.filter((x) => x !== id)
        : [...prev.selectedSpecialtyIds, id],
    }))

  const addCustom = () => {
    if (!customInput.trim()) return
    setData((prev) => ({ ...prev, customSpecialties: [...prev.customSpecialties, customInput.trim()] }))
    setCustomInput('')
  }

  return (
    <View>
      <StepHeader title="What are your specialties?" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {options.map((o) => (
          <Pill
            key={o.id}
            label={o.name}
            selected={data.selectedSpecialtyIds.includes(o.id)}
            onPress={() => toggle(o.id)}
          />
        ))}
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 16, marginBottom: 6 }}>
        Add another
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input value={customInput} onChangeText={setCustomInput} placeholder="Custom specialty" />
        </View>
        <TouchableOpacity
          onPress={addCustom}
          style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, backgroundColor: colors.teal }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>
      {data.customSpecialties.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {data.customSpecialties.map((c) => (
            <Pill key={c} label={c} selected onPress={() => {
              setData((prev) => ({ ...prev, customSpecialties: prev.customSpecialties.filter((x) => x !== c) }))
            }} />
          ))}
        </View>
      )}
      <NavFooter
        onBack={back}
        onContinue={advance}
        continueDisabled={data.selectedSpecialtyIds.length === 0 && data.customSpecialties.length === 0}
      />
    </View>
  )
}

function LanguagesStep({ data, setData, advance, back }: StepProps) {
  const toggle = (l: string) =>
    setData((prev) => ({
      ...prev,
      languages: prev.languages.includes(l) ? prev.languages.filter((x) => x !== l) : [...prev.languages, l],
    }))
  return (
    <View>
      <StepHeader title="Languages you see clients in" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {LANGUAGES.map((l) => (
          <Pill key={l} label={l} selected={data.languages.includes(l)} onPress={() => toggle(l)} />
        ))}
      </View>
      <NavFooter onBack={back} onContinue={advance} continueDisabled={data.languages.length === 0} />
    </View>
  )
}

function BioStep({ data, setData, advance, back }: StepProps) {
  return (
    <View>
      <StepHeader title="Short bio" subtitle="2–3 sentences. How you'd introduce yourself to a colleague." />
      <Input
        value={data.bio}
        onChangeText={(v) => setData((prev) => ({ ...prev, bio: v }))}
        placeholder="I'm a trauma-focused therapist who…"
        multiline
        maxLength={500}
      />
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, textAlign: 'right' }}>
        {data.bio.length} / 500
      </Text>
      <NavFooter onBack={back} onContinue={advance} continueDisabled={data.bio.trim().length < 20} />
    </View>
  )
}

function PhotoStep({ data, setData, advance, back }: StepProps) {
  const [uploading, setUploading] = useState(false)

  async function pickAndUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled) return

    setUploading(true)
    try {
      const asset = result.assets[0]
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) throw new Error('Not signed in')

      const filename = `${userId}-${Date.now()}.jpg`
      const response = await fetch(asset.uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename)
      setData((prev) => ({ ...prev, avatarUrl: urlData.publicUrl }))
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <View>
      <StepHeader title="Profile photo" subtitle="Optional, but profiles with photos get 3× more connections." />
      {data.avatarUrl ? (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <Image
            source={{ uri: data.avatarUrl }}
            style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: colors.teal }}
          />
        </View>
      ) : null}
      <TouchableOpacity
        onPress={pickAndUpload}
        disabled={uploading}
        style={{
          paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: colors.teal,
          alignItems: 'center', backgroundColor: colors.tealLight, opacity: uploading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: colors.teal, fontSize: 14, fontWeight: '700' }}>
          {uploading ? 'Uploading…' : data.avatarUrl ? 'Replace photo' : 'Upload a photo'}
        </Text>
      </TouchableOpacity>
      <NavFooter
        onBack={back}
        onContinue={advance}
        onSkip={advance}
        continueLabel="Finish"
      />
    </View>
  )
}
