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
import { colors } from '../../src/lib/colors'
import { apiSignup } from '../../src/lib/api'
import { supabase } from '../../src/lib/supabase'

export default function SignUpScreen() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Phone is collected on the verify-phone screen so the same step covers
  // both this email signup and the Google OAuth funnel.
  const canSubmit = fullName.trim() && email.trim() && password.length >= 8

  const handleSignUp = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const data = await apiSignup({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        password,
      })

      if (data.error === 'already_registered') {
        setError('This email is already registered. Try signing in instead.')
        return
      }
      if (data.error) {
        setError(data.error)
        return
      }

      // Sign in so verify-phone has an authenticated session to write
      // phone_verified against.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInErr) {
        setError('Account created, but sign-in failed. Please sign in manually.')
        return
      }

      router.push('/(auth)/verify-phone' as any)
    } catch {
      setError('Something went wrong. Please try again.')
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
          {/* Already have account */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              Already have an account?{' '}
            </Text>
            <Text
              style={{ fontSize: 13, color: colors.teal, fontWeight: '600', textDecorationLine: 'underline' }}
              onPress={() => router.push('/(auth)/sign-in')}
            >
              Sign In
            </Text>
          </View>

          {/* Full Name */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Full Name
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            style={{
              backgroundColor: colors.background,
              borderWidth: 1, borderColor: colors.border, borderRadius: 10,
              padding: 14, fontSize: 15, color: colors.textPrimary, marginBottom: 16,
            }}
          />

          {/* Email */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@practice.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: colors.background,
              borderWidth: 1, borderColor: colors.border, borderRadius: 10,
              padding: 14, fontSize: 15, color: colors.textPrimary, marginBottom: 16,
            }}
          />

          {/* Password */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Password
          </Text>
          <View style={{ position: 'relative', marginBottom: 16 }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              style={{
                backgroundColor: colors.background,
                borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                padding: 14, paddingRight: 48, fontSize: 15, color: colors.textPrimary,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 14, top: 14 }}
            >
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 16 }}>
            Next, we'll text you a 6-digit code to verify your phone.
          </Text>

          {/* Error */}
          {error && (
            <Text style={{ color: colors.destructive, fontSize: 13, marginBottom: 12 }}>
              {error}
            </Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading || !canSubmit}
            style={{
              backgroundColor: colors.teal,
              borderRadius: 10,
              padding: 16,
              alignItems: 'center',
              opacity: loading || !canSubmit ? 0.5 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
