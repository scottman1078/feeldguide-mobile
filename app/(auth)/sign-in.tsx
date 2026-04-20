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
import { useAuth } from '../../src/contexts/auth-context'
import { colors } from '../../src/lib/colors'

export default function SignInScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    const { error } = await signIn(email.trim().toLowerCase(), password)
    if (error) {
      setError('Invalid email or password. Please try again.')
    } else {
      router.replace('/(tabs)/discover')
    }
    setLoading(false)
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
          <View style={{ position: 'relative', marginBottom: 8 }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
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

          {/* Error */}
          {error && (
            <Text style={{ color: colors.destructive, fontSize: 13, marginBottom: 12 }}>
              {error}
            </Text>
          )}

          {/* Sign In button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading || !email.trim() || !password}
            style={{
              backgroundColor: colors.teal,
              borderRadius: 10,
              padding: 16,
              alignItems: 'center',
              marginTop: 8,
              opacity: loading || !email.trim() || !password ? 0.5 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot password */}
          <TouchableOpacity style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ fontSize: 13, color: colors.teal, fontWeight: '500' }}>
              Forgot password?
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
