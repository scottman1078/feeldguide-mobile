import { Redirect } from 'expo-router'
import { useAuth } from '../src/contexts/auth-context'
import { ActivityIndicator, View } from 'react-native'
import { colors } from '../src/lib/colors'

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

  return <Redirect href="/(tabs)/discover" />
}
