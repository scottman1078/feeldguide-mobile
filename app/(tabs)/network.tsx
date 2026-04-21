import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Alert } from 'react-native'
import { Users, UserPlus, Clock, Search, Check, X, MessageCircle, User } from 'lucide-react-native'
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

interface PendingRequest {
  id: string
  requesterProfile: {
    id: string
    full_name: string
    license_type: string | null
    location_city: string | null
    location_state: string | null
  }
}

export default function NetworkScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

    // Fetch pending incoming requests with profiles
    const { data: pendingData } = await supabase
      .from('fg_connections')
      .select('id, requester_id')
      .eq('recipient_id', user.id)
      .eq('status', 'pending')

    if (pendingData && pendingData.length > 0) {
      const requesterIds = pendingData.map(p => p.requester_id)
      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name, license_type, location_city, location_state')
        .in('id', requesterIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

      const mapped: PendingRequest[] = pendingData
        .map(p => {
          const prof = profileMap.get(p.requester_id)
          if (!prof) return null
          return { id: p.id, requesterProfile: prof }
        })
        .filter((x): x is PendingRequest => x !== null)

      setPendingRequests(mapped)
    } else {
      setPendingRequests([])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleAccept = async (connectionId: string) => {
    setActionLoading(connectionId)
    await supabase.from('fg_connections').update({ status: 'accepted' }).eq('id', connectionId)
    await fetchConnections()
    setActionLoading(null)
  }

  const handleDecline = async (connectionId: string) => {
    Alert.alert('Decline Request', 'Are you sure you want to decline this connection request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(connectionId)
          await supabase.from('fg_connections').update({ status: 'declined' }).eq('id', connectionId)
          await fetchConnections()
          setActionLoading(null)
        },
      },
    ])
  }

  const handleConnectionTap = (connection: Connection) => {
    const p = connection.otherProfile
    Alert.alert(p.full_name, p.license_type ?? 'Clinician', [
      {
        text: 'Message',
        onPress: () => router.push(`/messages?userId=${p.id}` as any),
      },
      {
        text: 'View Profile',
        onPress: () => router.push(`/profile?userId=${p.id}` as any),
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

  const filteredConnections = connections.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const p = c.otherProfile
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.license_type?.toLowerCase().includes(q) ||
      p.location_city?.toLowerCase().includes(q) ||
      p.location_state?.toLowerCase().includes(q)
    )
  })

  const renderPendingRequest = ({ item }: { item: PendingRequest }) => {
    const p = item.requesterProfile
    const isLoading = actionLoading === item.id
    return (
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.amber + '40',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.tealLight,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.teal }}>
              {getInitials(p.full_name)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
              {p.full_name}
            </Text>
            {p.license_type ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                {p.license_type}
              </Text>
            ) : null}
            {(p.location_city || p.location_state) ? (
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                {[p.location_city, p.location_state].filter(Boolean).join(', ')}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleAccept(item.id)}
              disabled={isLoading ? true : false}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.green + '15',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.green} />
              ) : (
                <Check size={18} color={colors.green} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDecline(item.id)}
              disabled={isLoading ? true : false}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.destructive + '15',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <X size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const renderConnection = ({ item }: { item: Connection }) => {
    const p = item.otherProfile
    return (
      <TouchableOpacity
        onPress={() => handleConnectionTap(item)}
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
          <MessageCircle size={18} color={colors.textMuted} />
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

      {/* Search bar */}
      <View style={{ paddingHorizontal: 20, marginTop: 12, marginBottom: 4 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
        }}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search connections..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, padding: 12, fontSize: 15, color: colors.textPrimary }}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={filteredConnections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
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

              {/* Pending requests section */}
              {pendingRequests.length > 0 ? (
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Clock size={16} color={colors.amber} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginLeft: 8 }}>
                      Pending Requests ({pendingRequests.length})
                    </Text>
                  </View>
                  {pendingRequests.map(req => (
                    <View key={req.id}>
                      {renderPendingRequest({ item: req })}
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Connections header */}
              {filteredConnections.length > 0 ? (
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
                  Connections ({filteredConnections.length})
                </Text>
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
