import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Store } from 'lucide-react-native'
import { colors } from '../../src/lib/colors'

export default function BoardScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Referral Board</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Post and respond to referral opportunities</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Store size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>No posts yet</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Referral board posts will appear here</Text>
      </View>
    </SafeAreaView>
  )
}
