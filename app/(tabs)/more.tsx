import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { User, Settings, UserPlus, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native'
import { colors } from '../../src/lib/colors'
import { useAuth } from '../../src/contexts/auth-context'
import { useRouter } from 'expo-router'
import { HeaderBar } from '../../src/components/header-bar'

const menuItems = [
  { key: 'profile', label: 'My Profile', Icon: User, route: '/profile' },
  { key: 'settings', label: 'Settings', Icon: Settings, route: '/settings' },
  { key: 'invite', label: 'Invite Colleagues', Icon: UserPlus, route: '/invite' },
  { key: 'help', label: 'Help Center', Icon: HelpCircle, route: null, url: 'https://feeldguide.com/dashboard/help' },
  { key: 'signout', label: 'Sign Out', Icon: LogOut, route: null, action: 'signout' },
] as const

export default function MoreScreen() {
  const { signOut } = useAuth()
  const router = useRouter()

  const handlePress = async (item: typeof menuItems[number]) => {
    if ('action' in item && item.action === 'signout') {
      await signOut()
      return
    }
    if ('url' in item && item.url) {
      Linking.openURL(item.url)
      return
    }
    if (item.route) {
      router.push(item.route as any)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 }}>
          More
        </Text>

        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}>
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1
            const isSignOut = 'action' in item && item.action === 'signout'
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => handlePress(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isSignOut ? '#fef2f2' : colors.tealLight,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 14,
                }}>
                  <item.Icon size={18} color={isSignOut ? colors.destructive : colors.teal} />
                </View>
                <Text style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: '600',
                  color: isSignOut ? colors.destructive : colors.textPrimary,
                }}>
                  {item.label}
                </Text>
                {!isSignOut && (
                  <ChevronRight size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
