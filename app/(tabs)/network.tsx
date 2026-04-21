import { View, Text, TouchableOpacity } from 'react-native'
import { Users, UserPlus } from 'lucide-react-native'
import { colors } from '../../src/lib/colors'
import { HeaderBar } from '../../src/components/header-bar'
import { useRouter } from 'expo-router'

export default function NetworkScreen() {
  const router = useRouter()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>My Network</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Your trusted connections</Text>
      </View>

      {/* Invite nudge card */}
      <View style={{
        marginHorizontal: 20,
        marginTop: 16,
        backgroundColor: colors.tealLight,
        borderRadius: 14,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.teal + '30',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <UserPlus size={20} color={colors.teal} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginLeft: 8 }}>
            Build Your Network
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 14 }}>
          Your network is stronger with more colleagues. Invite someone you trust.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/invite' as any)}
          style={{
            backgroundColor: colors.teal,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white }}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Users size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>No connections yet</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Find clinicians on the Discover tab</Text>
      </View>
    </View>
  )
}
