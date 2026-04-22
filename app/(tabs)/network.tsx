import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native'
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Search,
  Check,
  X,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native'
import { supabase } from '../../src/lib/supabase'
import { colors } from '../../src/lib/colors'
import { useAuth } from '../../src/contexts/auth-context'
import { HeaderBar } from '../../src/components/header-bar'
import { useRouter } from 'expo-router'

type ViewMode = 'my_network' | 'all_clinicians'
type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

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

interface Clinician {
  id: string
  full_name: string
  license_type: string | null
  location_city: string | null
  location_state: string | null
  avatar_url: string | null
  accepting_new_clients: boolean
  telehealth_available: boolean
  trust_score: number
  bio: string | null
}

export default function NetworkScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const [viewMode, setViewMode] = useState<ViewMode>('my_network')
  const [search, setSearch] = useState('')

  // My Network state
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loadingNetwork, setLoadingNetwork] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [pendingExpanded, setPendingExpanded] = useState(true)

  // All Clinicians state
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [loadingClinicians, setLoadingClinicians] = useState(false)
  const [connectionMap, setConnectionMap] = useState<Map<string, ConnectionStatus>>(new Map())
  const [connectingId, setConnectingId] = useState<string | null>(null)

  // ---- Fetch: My Network ----
  const fetchConnections = useCallback(async () => {
    if (!user) return
    setLoadingNetwork(true)

    // Fetch accepted connections
    const { data: connData } = await supabase
      .from('fg_partnerships')
      .select('id, requesting_id, receiving_id')
      .or(`requesting_id.eq.${user.id},receiving_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (connData && connData.length > 0) {
      const otherIds = connData.map(c =>
        c.requesting_id === user.id ? c.receiving_id : c.requesting_id
      )

      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name, license_type, location_city, location_state, avatar_url')
        .in('id', otherIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

      const mapped: Connection[] = connData
        .map(c => {
          const otherId = c.requesting_id === user.id ? c.receiving_id : c.requesting_id
          const prof = profileMap.get(otherId)
          if (!prof) return null
          return { id: c.id, otherProfile: prof }
        })
        .filter((x): x is Connection => x !== null)

      setConnections(mapped)
    } else {
      setConnections([])
    }

    // Fetch pending incoming requests
    const { data: pendingData } = await supabase
      .from('fg_partnerships')
      .select('id, requesting_id')
      .eq('receiving_id', user.id)
      .eq('status', 'pending')

    if (pendingData && pendingData.length > 0) {
      const requesterIds = pendingData.map(p => p.requesting_id)
      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name, license_type, location_city, location_state')
        .in('id', requesterIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

      const mapped: PendingRequest[] = pendingData
        .map(p => {
          const prof = profileMap.get(p.requesting_id)
          if (!prof) return null
          return { id: p.id, requesterProfile: prof }
        })
        .filter((x): x is PendingRequest => x !== null)

      setPendingRequests(mapped)
    } else {
      setPendingRequests([])
    }

    setLoadingNetwork(false)
  }, [user])

  // ---- Fetch: All Clinicians ----
  const fetchClinicians = useCallback(async () => {
    setLoadingClinicians(true)
    const { data } = await supabase
      .from('fg_profiles')
      .select('id, full_name, license_type, location_city, location_state, avatar_url, accepting_new_clients, telehealth_available, trust_score, bio')
      .eq('onboarding_completed', true)
      .eq('status', 'active')
      .order('trust_score', { ascending: false })
      .limit(50)

    if (data) setClinicians(data)
    setLoadingClinicians(false)
  }, [])

  // ---- Fetch: Connection statuses (for All Clinicians view) ----
  const fetchConnectionStatuses = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('fg_partnerships')
      .select('id, requesting_id, receiving_id, status')
      .or(`requesting_id.eq.${user.id},receiving_id.eq.${user.id}`)

    const map = new Map<string, ConnectionStatus>()
    if (data) {
      for (const conn of data) {
        const otherId = conn.requesting_id === user.id ? conn.receiving_id : conn.requesting_id
        if (conn.status === 'accepted') {
          map.set(otherId, 'accepted')
        } else if (conn.status === 'pending') {
          map.set(otherId, conn.requesting_id === user.id ? 'pending_sent' : 'pending_received')
        }
      }
    }
    setConnectionMap(map)
  }, [user])

  useEffect(() => {
    fetchConnections()
    fetchConnectionStatuses()
  }, [fetchConnections, fetchConnectionStatuses])

  // Lazy-load clinicians when switching to that tab
  useEffect(() => {
    if (viewMode === 'all_clinicians' && clinicians.length === 0) {
      fetchClinicians()
    }
  }, [viewMode, clinicians.length, fetchClinicians])

  // ---- Actions ----
  const handleAccept = async (connectionId: string) => {
    setActionLoading(connectionId)
    await supabase.from('fg_partnerships').update({ status: 'accepted' }).eq('id', connectionId)
    await fetchConnections()
    await fetchConnectionStatuses()
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
          await supabase.from('fg_partnerships').update({ status: 'declined' }).eq('id', connectionId)
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
        onPress: () => router.push(`/clinician?userId=${p.id}` as any),
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handleClinicianTap = (item: Clinician) => {
    router.push(`/clinician?userId=${item.id}` as any)
  }

  const handleConnect = async (clinicianId: string, clinicianName: string) => {
    if (!user) return
    setConnectingId(clinicianId)

    const { error } = await supabase.from('fg_partnerships').insert({
      requesting_id: user.id,
      receiving_id: clinicianId,
      status: 'pending',
    })

    if (error) {
      Alert.alert('Error', 'Could not send connection request. You may have already sent one.')
    } else {
      setConnectionMap(prev => {
        const next = new Map(prev)
        next.set(clinicianId, 'pending_sent')
        return next
      })
      Alert.alert('Request Sent', `Connection request sent to ${clinicianName}.`)
    }
    setConnectingId(null)
  }

  // ---- Helpers ----
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

  const filteredClinicians = clinicians.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.license_type?.toLowerCase().includes(q) ||
      c.location_city?.toLowerCase().includes(q) ||
      c.location_state?.toLowerCase().includes(q)
    )
  })

  const showInviteNudge = viewMode === 'my_network' && connections.length < 5

  // ---- Connection button for All Clinicians view ----
  const getConnectionButton = (clinicianId: string, clinicianName: string) => {
    if (clinicianId === user?.id) return null

    const status = connectionMap.get(clinicianId) ?? 'none'
    const isConnecting = connectingId === clinicianId

    if (status === 'accepted') {
      return (
        <TouchableOpacity
          onPress={() => router.push(`/messages?userId=${clinicianId}` as any)}
          style={{
            backgroundColor: colors.tealLight,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <MessageCircle size={12} color={colors.teal} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.teal, marginLeft: 4 }}>Message</Text>
        </TouchableOpacity>
      )
    }

    if (status === 'pending_sent') {
      return (
        <View style={{
          backgroundColor: colors.background,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <UserCheck size={12} color={colors.textMuted} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginLeft: 4 }}>Pending</Text>
        </View>
      )
    }

    if (status === 'pending_received') {
      return (
        <View style={{
          backgroundColor: colors.amber + '15',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.amber }}>Respond</Text>
        </View>
      )
    }

    return (
      <TouchableOpacity
        onPress={() => handleConnect(clinicianId, clinicianName)}
        disabled={isConnecting ? true : false}
        style={{
          backgroundColor: colors.teal,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: isConnecting ? 0.6 : 1,
        }}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <UserPlus size={12} color={colors.white} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.white, marginLeft: 4 }}>Connect</Text>
          </>
        )}
      </TouchableOpacity>
    )
  }

  // ---- Render: Pending request card ----
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

  // ---- Render: Connection card (My Network) ----
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

  // ---- Render: Clinician card (All Clinicians) ----
  const renderClinician = ({ item }: { item: Clinician }) => {
    return (
      <TouchableOpacity
        onPress={() => handleClinicianTap(item)}
        activeOpacity={0.7}
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
              {getInitials(item.full_name)}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
              {item.full_name}
            </Text>
            {item.license_type ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {item.license_type}
              </Text>
            ) : null}
            {(item.location_city || item.location_state) ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {[item.location_city, item.location_state].filter(Boolean).join(', ')}
              </Text>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {item.accepting_new_clients ? (
              <View style={{
                backgroundColor: '#dcfce7',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#16a34a' }}>Accepting</Text>
              </View>
            ) : null}
            {item.telehealth_available ? (
              <View style={{
                backgroundColor: '#dbeafe',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#2563eb' }}>Telehealth</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Connect button row */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
          {getConnectionButton(item.id, item.full_name)}
        </View>
      </TouchableOpacity>
    )
  }

  // ---- My Network list header ----
  const MyNetworkHeader = () => (
    <View>
      {/* Invite nudge card - show if < 5 connections */}
      {showInviteNudge ? (
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
      ) : null}

      {/* Pending requests collapsible banner */}
      {pendingRequests.length > 0 ? (
        <View style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setPendingExpanded(prev => !prev)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.amber + '12',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: pendingExpanded ? 10 : 0,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={16} color={colors.amber} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginLeft: 8 }}>
                Pending Requests ({pendingRequests.length})
              </Text>
            </View>
            {pendingExpanded ? (
              <ChevronUp size={18} color={colors.textMuted} />
            ) : (
              <ChevronDown size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          {pendingExpanded ? (
            <>
              {pendingRequests.map(req => (
                <View key={req.id}>
                  {renderPendingRequest({ item: req })}
                </View>
              ))}
            </>
          ) : null}
        </View>
      ) : null}

      {/* Connections count header */}
      {filteredConnections.length > 0 ? (
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
          Connections ({filteredConnections.length})
        </Text>
      ) : null}
    </View>
  )

  const isLoading = viewMode === 'my_network' ? loadingNetwork : loadingClinicians

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      {/* Page title */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Network</Text>
      </View>

      {/* Pill toggle: My Network / All Clinicians */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 12,
        marginBottom: 8,
        gap: 8,
      }}>
        <TouchableOpacity
          onPress={() => setViewMode('my_network')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: viewMode === 'my_network' ? colors.teal : colors.white,
            borderWidth: 1,
            borderColor: viewMode === 'my_network' ? colors.teal : colors.border,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: viewMode === 'my_network' ? colors.white : colors.textSecondary,
          }}>
            My Network
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('all_clinicians')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: viewMode === 'all_clinicians' ? colors.teal : colors.white,
            borderWidth: 1,
            borderColor: viewMode === 'all_clinicians' ? colors.teal : colors.border,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: viewMode === 'all_clinicians' ? colors.white : colors.textSecondary,
          }}>
            All Clinicians
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
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
            placeholder={viewMode === 'my_network' ? 'Search connections...' : 'Search by name, license, city...'}
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, padding: 12, fontSize: 15, color: colors.textPrimary }}
          />
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : viewMode === 'my_network' ? (
        <FlatList
          data={filteredConnections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
          ListHeaderComponent={<MyNetworkHeader />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Users size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>
                No connections yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                Switch to All Clinicians to find colleagues
              </Text>
            </View>
          }
          renderItem={renderConnection}
        />
      ) : (
        <FlatList
          data={filteredClinicians}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>No clinicians found</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Try a different search</Text>
            </View>
          }
          renderItem={renderClinician}
        />
      )}
    </View>
  )
}
