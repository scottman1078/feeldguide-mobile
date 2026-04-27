import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  apiCheckPhoneCode,
  apiSendPhoneCode,
  apiSavePhoneVerified,
} from '../../src/lib/api'
import { colors } from '../../src/lib/colors'

function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 10)
  if (digits.length > 6) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length > 3) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  if (digits.length > 0) return `(${digits}`
  return ''
}

// Two-stage screen — collects phone, sends Twilio code, verifies, then
// persists phone_verified=true on fg_profiles. Same flow whether the
// user got here from email signup or Google OAuth.
export default function VerifyPhoneScreen() {
  const router = useRouter()
  const [stage, setStage] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRef = useRef<TextInput>(null)

  const phoneDigits = phone.replace(/\D/g, '')

  // Cooldown timer for the Resend button.
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Auto-focus the code input when we switch stages.
  useEffect(() => {
    if (stage === 'code') {
      setTimeout(() => codeInputRef.current?.focus(), 200)
    }
  }, [stage])

  const handleSendCode = async () => {
    if (phoneDigits.length !== 10) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiSendPhoneCode(phoneDigits)
      if (!result.success) {
        setError(result.error || 'Failed to send code. Try again.')
        return
      }
      setStage('code')
      setResendCooldown(60)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiCheckPhoneCode(phoneDigits, code)
      if (!result.success) {
        setError('Invalid code. Please try again.')
        return
      }

      // Persist phone_verified=true so the (tabs) gate doesn't bounce
      // the user back here next launch.
      const save = await apiSavePhoneVerified(phoneDigits)
      if (save?.error) {
        setError('Verified, but we could not save your phone. Please try again.')
        return
      }

      router.replace('/onboarding' as any)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    try {
      await apiSendPhoneCode(phoneDigits)
      setResendCooldown(60)
      setError(null)
    } catch {
      setError('Failed to resend code.')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary }}>
            Feeld<Text style={{ color: colors.teal }}>Guide</Text>
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}
        >
          {/* Phone icon */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.tealLight,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 28 }}>📱</Text>
          </View>

          {stage === 'phone' ? (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
                Verify your phone
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                Enter your mobile number so we can text you a 6-digit verification code.
              </Text>

              <TextInput
                value={phone}
                onChangeText={(val) => setPhone(formatPhone(val))}
                placeholder="(555) 555-0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoFocus
                style={{
                  width: '100%',
                  backgroundColor: colors.background,
                  borderWidth: 2,
                  borderColor: phoneDigits.length === 10 ? colors.teal : colors.border,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 18,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              />

              {error && (
                <Text style={{ color: colors.destructive, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                  {error}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleSendCode}
                disabled={loading || phoneDigits.length !== 10}
                style={{
                  width: '100%',
                  backgroundColor: colors.teal,
                  borderRadius: 10,
                  padding: 16,
                  alignItems: 'center',
                  marginTop: 20,
                  opacity: loading || phoneDigits.length !== 10 ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>
                    Send Code
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
                Enter the code
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                We sent a 6-digit code to{'\n'}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{phone}</Text>
              </Text>

              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={(val) => setCode(val.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                style={{
                  width: '100%',
                  backgroundColor: colors.background,
                  borderWidth: 2,
                  borderColor: code.length === 6 ? colors.teal : colors.border,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 28,
                  fontWeight: '800',
                  color: colors.textPrimary,
                  textAlign: 'center',
                  letterSpacing: 12,
                  marginBottom: 8,
                }}
              />

              {error && (
                <Text style={{ color: colors.destructive, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                  {error}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleVerify}
                disabled={loading || code.length !== 6}
                style={{
                  width: '100%',
                  backgroundColor: colors.teal,
                  borderRadius: 10,
                  padding: 16,
                  alignItems: 'center',
                  marginTop: 20,
                  opacity: loading || code.length !== 6 ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>
                    Verify & Continue
                  </Text>
                )}
              </TouchableOpacity>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginTop: 20,
                }}
              >
                <TouchableOpacity onPress={() => { setStage('phone'); setCode(''); setError(null) }}>
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>Change number</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: resendCooldown > 0 ? colors.textMuted : colors.teal,
                      fontWeight: '600',
                    }}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
