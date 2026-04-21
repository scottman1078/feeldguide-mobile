import { View, Text } from 'react-native'
import { MessageSquare } from 'lucide-react-native'
import { colors } from '../../src/lib/colors'
import { HeaderBar } from '../../src/components/header-bar'

export default function MessagesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Messages</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Direct messaging with your network</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <MessageSquare size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>No messages yet</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Connect with clinicians to start messaging</Text>
      </View>
    </View>
  )
}
