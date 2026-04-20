import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Send } from 'lucide-react-native'
import { colors } from '../../src/lib/colors'

export default function ReferralsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>My Referrals</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Track referrals sent and received</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Send size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>No referrals yet</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Your referral pipeline will appear here</Text>
      </View>
    </SafeAreaView>
  )
}
