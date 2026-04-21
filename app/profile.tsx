import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, ExternalLink } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { useRouter } from 'expo-router'

export default function ProfileScreen() {
  const { profile } = useAuth()
  const router = useRouter()

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

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
          My Profile
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' }}>
        {/* Avatar */}
        <View style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.tealLight,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 24,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: colors.teal }}>
            {profile?.full_name ? getInitials(profile.full_name) : '?'}
          </Text>
        </View>

        {/* Name */}
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>
          {profile?.full_name || 'Unknown'}
        </Text>

        {/* Credentials */}
        {profile?.license_type && (
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
            {profile.license_type}
          </Text>
        )}

        {/* Location */}
        {(profile?.location_city || profile?.location_state) && (
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
            {[profile.location_city, profile.location_state].filter(Boolean).join(', ')}
          </Text>
        )}

        {/* Info card */}
        <View style={{
          width: '100%',
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          marginTop: 24,
        }}>
          <InfoRow label="Email" value={profile?.email || '--'} />
          <InfoRow label="Tier" value={profile?.user_tier || 'free'} />
          <InfoRow label="Trust Score" value={String(profile?.trust_score ?? 0)} />
        </View>

        {/* Edit on web */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://feeldguide.com/dashboard/settings')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.teal,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 24,
            marginTop: 24,
            width: '100%',
          }}
        >
          <ExternalLink size={16} color={colors.white} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white, marginLeft: 8 }}>
            Edit on Web
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{value}</Text>
    </View>
  )
}
