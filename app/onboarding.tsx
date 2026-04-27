import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { HeartHandshake } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { StepContent } from '../src/components/onboarding/steps'
import { ProgressBar } from '../src/components/onboarding/primitives'
import {
  stepsFor,
  trackFor,
  stepIndex,
  totalSteps,
  type OnboardingStep,
} from '../src/lib/onboarding-constants'
import { createInitialOnboardingData, type OnboardingData } from '../src/lib/onboarding-types'
import { saveStep, submitOnboarding } from '../src/lib/onboarding-api'
import { shouldHoldOnWaitlist } from '../src/lib/waitlist'
import { DIAGNOSIS_CATEGORIES } from '../src/lib/onboarding-constants'

const STORAGE_KEY = 'fg_onboarding_state'

/**
 * Mobile mirror of the web onboarding flow. Same step order, same API endpoints.
 * State is persisted to AsyncStorage on every change so partial progress survives
 * app kill; each step transition also POSTs /api/onboarding/step so admins see
 * where users are in the funnel.
 */
export default function OnboardingScreen() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()

  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [data, setData] = useState<OnboardingData>(() => createInitialOnboardingData(DIAGNOSIS_CATEGORIES))
  const [submitting, setSubmitting] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.step) setStep(parsed.step)
          if (parsed.data) setData((prev) => ({ ...prev, ...parsed.data }))
        }
        // Pre-fill phone if we have it from signup.
        if (profile?.phone) {
          setData((prev) => ({
            ...prev,
            phone: prev.phone || (profile.phone as string),
            normalizedPhone: prev.normalizedPhone || (profile.phone as string),
            phoneVerified: true,
          }))
        }
      } finally {
        setHydrated(true)
      }
    })()
  }, [profile?.phone])

  // Persist state whenever it changes.
  useEffect(() => {
    if (!hydrated) return
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data })).catch(() => {})
  }, [step, data, hydrated])

  // Write current step to fg_profiles.onboarding_step for admin visibility.
  useEffect(() => {
    if (!hydrated) return
    saveStep(step)
  }, [step, hydrated])

  const track = trackFor({ isLicensed: data.isLicensed, isAuxiliary: data.isAuxiliary })
  const steps = stepsFor(track)

  const advance = useCallback(() => {
    const i = (steps as readonly string[]).indexOf(step)
    const next = steps[Math.min(i + 1, steps.length - 1)] as OnboardingStep
    if (next === 'complete') {
      void handleComplete()
      return
    }
    setStep(next)
  }, [step, steps, data])

  const back = useCallback(() => {
    const i = (steps as readonly string[]).indexOf(step)
    const prev = steps[Math.max(i - 1, 0)] as OnboardingStep
    // Stepping back over licensed_check clears the answer so the user
    // can pick the other branch without stale supporter state.
    if (prev === 'licensed_check') {
      setData((d) => ({ ...d, isLicensed: null, supporterSubtype: '', supporterDetail: '' }))
    }
    setStep(prev)
  }, [step, steps])

  async function handleComplete() {
    if (!user?.email) return
    setSubmitting(true)
    try {
      await submitOnboarding(data, user.email, profile?.full_name || '')
      await AsyncStorage.removeItem(STORAGE_KEY)
      await refreshProfile()
      const goWaitlist = shouldHoldOnWaitlist({
        email: user.email,
        isAdmin: !!profile?.is_admin,
      })
      router.replace((goWaitlist ? '/waitlist' : '/(tabs)/feed') as any)
    } catch (err) {
      Alert.alert(
        'Could not save profile',
        err instanceof Error ? err.message : 'Try again — your progress is saved.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!hydrated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted }}>Loading…</Text>
        </View>
      </SafeAreaView>
    )
  }

  const currentIndex = stepIndex(step, track) + 1
  const total = totalSteps(track)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <HeartHandshake size={18} color={colors.teal} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginLeft: 6 }}>
            Feeld<Text style={{ color: colors.teal }}>Guide</Text>
          </Text>
        </View>

        <ProgressBar current={currentIndex} total={total} />

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <StepContent
            step={step}
            data={data}
            setData={setData}
            advance={submitting ? () => {} : advance}
            back={back}
          />
          {submitting && (
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 12 }}>
              Saving your profile…
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
