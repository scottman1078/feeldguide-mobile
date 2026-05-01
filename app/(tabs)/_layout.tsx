import { useEffect, useState } from 'react'
import { Slot, useRouter, usePathname } from 'expo-router'
import { View, Text, TouchableOpacity } from 'react-native'
import { Rss, Send, Users, MessageSquare, MoreHorizontal } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../src/lib/colors'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/auth-context'
import { TrialBanner } from '../../src/components/trial-banner'
import { shouldHoldOnWaitlist } from '../../src/lib/waitlist'

const tabs = [
  { name: 'feed', label: 'Board', Icon: Rss },
  { name: 'network', label: 'Network', Icon: Users },
  { name: 'referrals', label: 'Referrals', Icon: Send, clinicianOnly: true },
  { name: 'messages', label: 'Messages', Icon: MessageSquare },
  { name: 'more', label: 'More', Icon: MoreHorizontal },
]

export default function TabLayout() {
  const router = useRouter()
  const pathname = usePathname()
  const { profile } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  // Gate: incomplete onboarding bounces to /onboarding. Admins skip this.
  useEffect(() => {
    if (!profile) return
    if (!profile.is_admin && !profile.onboarding_completed) {
      router.replace('/onboarding' as any)
    }
  }, [profile, router])

  // Pre-launch waitlist gate: completed users land on /waitlist until launch.
  useEffect(() => {
    if (!profile?.onboarding_completed) return
    if (shouldHoldOnWaitlist({ email: profile.email, isAdmin: !!profile.is_admin })) {
      router.replace('/waitlist' as any)
    }
  }, [profile, router])

  // Soft lockout: bounce expired users to the reactivate screen.
  useEffect(() => {
    const status = profile?.subscription_status
    if (!status) return
    if ((status === 'expired' || status === 'canceled') && !pathname.includes('reactivate') && !pathname.includes('profile') && !pathname.includes('settings')) {
      router.replace('/reactivate' as any)
    }
  }, [profile?.subscription_status, pathname, router])

  // Supporter gate: bounce supporters off clinician-only screens (Referrals).
  // Catches direct deep-links and stale tab state alike.
  useEffect(() => {
    if (profile?.user_tier !== 'supporter') return
    if (pathname.includes('referrals')) {
      router.replace('/(tabs)/feed' as any)
    }
  }, [profile?.user_tier, pathname, router])

  const isSupporter = profile?.user_tier === 'supporter'
  const visibleTabs = tabs.filter((t) => !(isSupporter && t.clinicianOnly))

  useEffect(() => {
    if (!profile?.id) return

    async function fetchUnread() {
      const { count } = await supabase
        .from('fg_messages')
        .select('*', { count: 'exact', head: 1 })
        .eq('receiver_id', profile!.id)
        .is('read_at', null)
      setUnreadCount(count || 0)
    }

    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [profile?.id])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <TrialBanner />
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
        {visibleTabs.map(({ name, label, Icon }) => {
          const active = pathname.includes(name)
          const badge = name === 'messages' && unreadCount > 0 ? unreadCount : 0
          return (
            <TouchableOpacity
              key={name}
              onPress={() => router.push(`/(tabs)/${name}` as any)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
            >
              <View style={{ position: 'relative' }}>
                <Icon size={22} color={active ? colors.teal : colors.textMuted} />
                {badge > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -6,
                    right: -10,
                    backgroundColor: '#ef4444',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                )}
              </View>
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
