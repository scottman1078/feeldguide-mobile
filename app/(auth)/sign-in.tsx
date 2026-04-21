import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { apiSendPhoneCode, apiCheckPhoneCode } from '../../src/lib/api'
import { colors } from '../../src/lib/colors'

const API_BASE = 'https://www.feeldguide.com'

function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 10)
  if (digits.length > 6) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length > 3) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  if (digits.length > 0) return `(${digits}`
  return ''
}

type Step = 'phone' | 'code'

export default function SignInScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [normalizedPhone, setNormalizedPhone] = useState('')

  const phoneDigits = phone.replace(/\D/g, '')

  const handleSendCode = async () => {
    if (phoneDigits.length !== 10) return
    setLoading(true)
    setError(null)

    try {
      // Check if phone exists via server API (can't query directly - not authenticated yet)
      const checkRes = await fetch(`${API_BASE}/api/auth/phone-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, checkOnly: 1 }),
      })
      const checkData = await checkRes.json()
      if (checkData.error) {
        setError('No account found with this phone number. Please sign up first.')
        return
      }

      const result = await apiSendPhoneCode(phone)
      if (result.error) {
        setError(result.error)
        return
      }
      setNormalizedPhone(result.normalizedPhone || phone)
      setStep('code')
    } catch {
      setError('Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndSignIn = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)

    try {
      // Verify the code
      const checkResult = await apiCheckPhoneCode(normalizedPhone, code)
      if (!checkResult.success) {
        setError('Invalid code. Please try again.')
        setLoading(false)
        return
      }

      // Look up user by phone and create a session
      // We need to call a phone-session endpoint
      const API_BASE = 'https://www.feeldguide.com'
      const sessionRes = await fetch(`${API_BASE}/api/auth/phone-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone }),
      })
      const sessionData = await sessionRes.json()

      if (sessionData.error) {
        setError(sessionData.error || 'No account found with this phone number.')
        setLoading(false)
        return
      }

      // Set the session in supabase client
      if (sessionData.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        })
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
          setLoading(false)
          return
        }
        router.replace('/(tabs)/discover')
      } else {
        setError('Could not sign in. Try creating an account.')
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary }}>
            Feeld<Text style={{ color: colors.teal }}>Guide</Text>
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>
            The clinician-to-clinician referral network
          </Text>
        </View>

        <View style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          {/* New user link */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              New to FeeldGuide?{' '}
            </Text>
            <Text
              style={{ fontSize: 13, color: colors.teal, fontWeight: '600', textDecorationLine: 'underline' }}
              onPress={() => router.push('/(auth)/sign-up')}
            >
              Get started
            </Text>
          </View>

          {step === 'phone' ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                Sign in with your phone
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
                We'll text you a verification code
              </Text>

              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Phone Number
              </Text>
              <TextInput
                value={phone}
                onChangeText={(val) => setPhone(formatPhone(val))}
                placeholder="(555) 555-0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoFocus
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                  padding: 14, fontSize: 15, color: colors.textPrimary, marginBottom: 8,
                }}
              />

              {error && (
                <Text style={{ color: colors.destructive, fontSize: 13, marginBottom: 12 }}>{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleSendCode}
                disabled={loading || phoneDigits.length !== 10}
                style={{
                  backgroundColor: colors.teal, borderRadius: 10, padding: 16,
                  alignItems: 'center', marginTop: 8,
                  opacity: loading || phoneDigits.length !== 10 ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>Send Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                Enter verification code
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
                Sent to <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{phone}</Text>
              </Text>

              <TextInput
                value={code}
                onChangeText={(val) => setCode(val.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 2, borderColor: code.length === 6 ? colors.teal : colors.border,
                  borderRadius: 12, padding: 16, fontSize: 28, fontWeight: '800',
                  color: colors.textPrimary, textAlign: 'center', letterSpacing: 12,
                  marginBottom: 8,
                }}
              />

              {error && (
                <Text style={{ color: colors.destructive, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleVerifyAndSignIn}
                disabled={loading || code.length !== 6}
                style={{
                  backgroundColor: colors.teal, borderRadius: 10, padding: 16,
                  alignItems: 'center', marginTop: 12,
                  opacity: loading || code.length !== 6 ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                <TouchableOpacity onPress={() => { setStep('phone'); setCode(''); setError(null) }}>
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>Change number</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendCode}>
                  <Text style={{ fontSize: 13, color: colors.teal, fontWeight: '600' }}>Resend code</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
