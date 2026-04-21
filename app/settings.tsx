import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, ExternalLink, LogOut } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { useRouter } from 'expo-router'

export default function SettingsScreen() {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Back header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginLeft: 12 }}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Account Info */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Account
        </Text>
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 24,
        }}>
          <SettingsRow label="Name" value={profile?.full_name || '--'} />
          <SettingsRow label="Email" value={profile?.email || '--'} />
          <SettingsRow label="License" value={profile?.license_type || '--'} isLast={true} />
        </View>

        {/* Edit on Web */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://feeldguide.com/dashboard/settings')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 14,
            paddingHorizontal: 24,
            marginBottom: 16,
          }}
        >
          <ExternalLink size={16} color={colors.teal} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.teal, marginLeft: 8 }}>
            Edit Profile on Web
          </Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={signOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#fecaca',
            paddingVertical: 14,
            paddingHorizontal: 24,
          }}
        >
          <LogOut size={16} color={colors.destructive} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.destructive, marginLeft: 8 }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function SettingsRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{value}</Text>
    </View>
  )
}
