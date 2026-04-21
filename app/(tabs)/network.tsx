import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { Users, UserPlus, Clock } from 'lucide-react-native'
import { supabase } from '../../src/lib/supabase'
import { colors } from '../../src/lib/colors'
import { useAuth } from '../../src/contexts/auth-context'
import { HeaderBar } from '../../src/components/header-bar'
import { useRouter } from 'expo-router'

interface Connection {
  id: string
  otherProfile: {
    id: string
    full_name: string
    license_type: string | null
    location_city: string | null
    location_state: string | null
    avatar_url: string | null
  }
}

export default function NetworkScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchConnections = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Fetch accepted connections
    const { data: connData } = await supabase
      .from('fg_connections')
      .select('id, requester_id, recipient_id')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (connData && connData.length > 0) {
      // Get the other user's ID for each connection
      const otherIds = connData.map(c =>
        c.requester_id === user.id ? c.recipient_id : c.requester_id
      )

      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name, license_type, location_city, location_state, avatar_url')
        .in('id', otherIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

      const mapped: Connection[] = connData
        .map(c => {
          const otherId = c.requester_id === user.id ? c.recipient_id : c.requester_id
          const prof = profileMap.get(otherId)
          if (!prof) return null
          return { id: c.id, otherProfile: prof }
        })
        .filter((x): x is Connection => x !== null)

      setConnections(mapped)
    } else {
      setConnections([])
    }

    // Fetch pending incoming requests count
    const { count } = await supabase
      .from('fg_connections')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('status', 'pending')

    setPendingCount(count ?? 0)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

  const renderConnection = ({ item }: { item: Connection }) => {
    const p = item.otherProfile
    return (
      <TouchableOpacity
        style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border,
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
              {getInitials(p.full_name)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
              {p.full_name}
            </Text>
            {p.license_type ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {p.license_type}
              </Text>
            ) : null}
            {(p.location_city || p.location_state) ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {[p.location_city, p.location_state].filter(Boolean).join(', ')}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>My Network</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Your trusted connections</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
          ListHeaderComponent={
            <View>
              {/* Invite nudge card */}
              <View style={{
                backgroundColor: colors.tealLight,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.teal + '30',
                marginBottom: 12,
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

              {/* Pending requests banner */}
              {pendingCount > 0 ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: colors.amber + '40',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Clock size={18} color={colors.amber} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginLeft: 10, flex: 1 }}>
                    {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
                  </Text>
                  <View style={{
                    backgroundColor: colors.amber + '20',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.amber }}>Review</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Users size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>No connections yet</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Find clinicians on the Discover tab</Text>
            </View>
          }
          renderItem={renderConnection}
        />
      )}
    </View>
  )
}
