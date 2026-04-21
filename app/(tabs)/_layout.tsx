import { Tabs } from 'expo-router'
import { Search, Send, Store, Users, MessageSquare } from 'lucide-react-native'
import { colors } from '../../src/lib/colors'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false as any,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="referrals"
        options={{
          title: 'Referrals',
          tabBarIcon: ({ color, size }) => <Send size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: 'Board',
          tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: 'Network',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
