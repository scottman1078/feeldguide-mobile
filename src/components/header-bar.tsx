import { View, Text, TouchableOpacity } from 'react-native'
import { Bell } from 'lucide-react-native'
import { colors } from '../lib/colors'
import { useAuth } from '../contexts/auth-context'
import { useRouter } from 'expo-router'

export function HeaderBar() {
  const { profile } = useAuth()
  const router = useRouter()

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.background,
    }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary }}>
        Feeld<Text style={{ color: colors.teal }}>Guide</Text>
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Bell size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/profile' as any)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.tealLight,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal }}>
            {profile?.full_name ? getInitials(profile.full_name) : '?'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
