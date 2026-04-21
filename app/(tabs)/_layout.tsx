import { Slot, useRouter, usePathname } from 'expo-router'
import { View, Text, TouchableOpacity } from 'react-native'
import { Search, Send, Store, Users, MessageSquare } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../src/lib/colors'

const tabs = [
  { name: 'discover', label: 'Discover', Icon: Search },
  { name: 'referrals', label: 'Referrals', Icon: Send },
  { name: 'board', label: 'Board', Icon: Store },
  { name: 'network', label: 'Network', Icon: Users },
  { name: 'messages', label: 'Messages', Icon: MessageSquare },
]

export default function TabLayout() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: 4,
        paddingTop: 8,
      }}>
        {tabs.map(({ name, label, Icon }) => {
          const active = pathname.includes(name)
          return (
            <TouchableOpacity
              key={name}
              onPress={() => router.push(`/(tabs)/${name}` as any)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
            >
              <Icon size={22} color={active ? colors.teal : colors.textMuted} />
              <Text style={{
                fontSize: 10,
                fontWeight: '600',
                color: active ? colors.teal : colors.textMuted,
                marginTop: 2,
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}
