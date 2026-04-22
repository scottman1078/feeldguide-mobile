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
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { apiCheckPhoneCode, apiSendPhoneCode } from '../../src/lib/api'
import { colors } from '../../src/lib/colors'

export default function VerifyPhoneScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ phone: string; email: string; password: string }>()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRef = useRef<TextInput>(null)

  // Auto-focus
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleVerify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)

    try {
      const result = await apiCheckPhoneCode(params.phone, code)

      if (!result.success) {
        setError('Invalid code. Please try again.')
        setLoading(false)
        return
      }

      // Phone verified — sign in with email/password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      })

      if (signInError) {
        setError('Verified but could not sign in. Try signing in manually.')
        setLoading(false)
        return
      }

      router.replace('/(tabs)/feed')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    try {
      await apiSendPhoneCode(params.phone)
      setResendCooldown(60)
      setError(null)
    } catch {
      setError('Failed to resend code.')
    }
  }

  // Format phone for display
  const displayPhone = params.phone || '(***) ***-****'

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

        <View style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        }}>
          {/* Phone icon */}
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.tealLight,
            justifyContent: 'center', alignItems: 'center',
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 28 }}>📱</Text>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
            Verify your phone
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{displayPhone}</Text>
          </Text>

          {/* Code input */}
          <TextInput
            ref={inputRef}
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

          {/* Error */}
          {error && (
            <Text style={{ color: colors.destructive, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
              {error}
            </Text>
          )}

          {/* Verify button */}
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

          {/* Resend / Change number */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                Change number
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
              <Text style={{ fontSize: 13, color: resendCooldown > 0 ? colors.textMuted : colors.teal, fontWeight: '600' }}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
