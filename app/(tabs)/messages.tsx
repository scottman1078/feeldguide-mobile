import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { MessageSquare, Plus } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { colors } from '../../src/lib/colors'
import { useAuth } from '../../src/contexts/auth-context'
import { HeaderBar } from '../../src/components/header-bar'

interface Thread {
  partnerId: string
  partnerName: string
  partnerAvatarUrl: string | null
  lastMessage: string
  lastMessageAt: string
  unread: number
}

export default function MessagesScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  const fetchThreads = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Fetch all messages involving the current user
    const { data: messages } = await supabase
      .from('fg_messages')
      .select('id, sender_id, receiver_id, content, read_at, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!messages || messages.length === 0) {
      setThreads([])
      setLoading(false)
      return
    }

    // Group by conversation partner
    const threadMap = new Map<string, { lastMessage: string; lastMessageAt: string; unreadCount: number }>()

    for (const msg of messages) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      if (!threadMap.has(partnerId)) {
        const isUnread = msg.receiver_id === user.id && !msg.read_at
        threadMap.set(partnerId, {
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          unreadCount: isUnread ? 1 : 0,
        })
      } else {
        // Only count unread for messages sent TO the current user
        if (msg.receiver_id === user.id && !msg.read_at) {
          const existing = threadMap.get(partnerId)!
          existing.unreadCount += 1
        }
      }
    }

    // Fetch partner profiles
    const partnerIds = [...threadMap.keys()]
    const { data: profiles } = await supabase
      .from('fg_profiles')
      .select('id, full_name, avatar_url')
      .in('id', partnerIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

    const threadList: Thread[] = partnerIds
      .map(pid => {
        const t = threadMap.get(pid)!
        const prof = profileMap.get(pid)
        return {
          partnerId: pid,
          partnerName: prof?.full_name ?? 'Unknown',
          partnerAvatarUrl: prof?.avatar_url ?? null,
          lastMessage: t.lastMessage,
          lastMessageAt: t.lastMessageAt,
          unread: t.unreadCount,
        }
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    setThreads(threadList)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const renderThread = ({ item }: { item: Thread }) => (
    <TouchableOpacity
      onPress={() => router.push(`/conversation?userId=${item.partnerId}&userName=${encodeURIComponent(item.partnerName)}` as any)}
      activeOpacity={0.7}
      style={{
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: item.unread > 0 ? colors.teal + '40' : colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.tealLight,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.teal }}>
            {getInitials(item.partnerName)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{
              fontSize: 15,
              fontWeight: item.unread > 0 ? '800' : '600',
              color: colors.textPrimary,
            }}>
              {item.partnerName}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text
              style={{
                fontSize: 13,
                color: item.unread > 0 ? colors.textPrimary : colors.textMuted,
                fontWeight: item.unread > 0 ? '600' : '400',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            {item.unread > 0 ? (
              <View style={{
                backgroundColor: colors.teal,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 6,
                marginLeft: 8,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.white }}>
                  {item.unread}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Messages</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Direct messaging with your network</Text>
      </View>

      <View style={{
        backgroundColor: colors.amber + '18',
        borderWidth: 1,
        borderColor: colors.amber + '40',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginTop: 12,
      }}>
        <Text style={{ fontSize: 12, color: colors.amber, fontWeight: '600', textAlign: 'center' }}>
          Do not include patient names or identifying information in messages.
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={item => item.partnerId}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <MessageSquare size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>No messages yet</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Connect with clinicians to start messaging</Text>
            </View>
          }
          renderItem={renderThread}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push('/conversation' as any)}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.teal,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Plus size={26} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}
