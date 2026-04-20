import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Users } from 'lucide-react-native'
import { colors } from '../../src/lib/colors'

export default function NetworkScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>My Network</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Your trusted connections</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Users size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>No connections yet</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Find clinicians on the Discover tab</Text>
      </View>
    </SafeAreaView>
  )
}
