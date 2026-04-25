import { Redirect } from 'expo-router'
import { useAuth } from '../src/contexts/auth-context'
import { ActivityIndicator, View } from 'react-native'
import { colors } from '../src/lib/colors'
import { shouldHoldOnWaitlist } from '../src/lib/waitlist'

export default function Index() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-up" />
  }

  // Wait for profile before deciding which gate the user should land on.
  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    )
  }

  if (!profile.is_admin && !profile.onboarding_completed) {
    return <Redirect href="/onboarding" />
  }

  if (shouldHoldOnWaitlist({ email: profile.email, isAdmin: !!profile.is_admin })) {
    return <Redirect href={'/waitlist' as any} />
  }

  return <Redirect href="/(tabs)/feed" />
}
