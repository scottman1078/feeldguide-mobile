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
  List as ListIcon,
  Map as MapIcon,
} from 'lucide-react-native'
import MapView, { Marker } from 'react-native-maps'
import { supabase } from '../../src/lib/supabase'
import { colors } from '../../src/lib/colors'
import { useAuth } from '../../src/contexts/auth-context'
import { HeaderBar } from '../../src/components/header-bar'
import { useRouter } from 'expo-router'

type ViewMode = 'my_network' | 'all_clinicians'
type CliniciansDisplay = 'list' | 'map'
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
  const [cliniciansDisplay, setCliniciansDisplay] = useState<CliniciansDisplay>('list')
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

  // ---- Invite CTA banner (used by All Clinicians view) ----
  const InviteCTA = () => (
    <TouchableOpacity
      onPress={() => router.push('/invite' as any)}
      style={{
        backgroundColor: colors.teal,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <UserPlus size={20} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>
          Grow your network
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
          Invite a colleague
        </Text>
      </View>
      <View style={{
        backgroundColor: colors.white,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal }}>Invite</Text>
      </View>
    </TouchableOpacity>
  )

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

  const isLoading =
    viewMode === 'my_network' ? loadingNetwork : loadingClinicians

  const searchPlaceholder =
    viewMode === 'my_network'
      ? 'Search connections...'
      : 'Search by name, license, city...'

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      {/* Page title */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Network</Text>
      </View>

      {/* Pill toggle: My Network / Clinicians */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 12,
        marginBottom: 8,
        gap: 6,
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
            fontSize: 13,
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
            fontSize: 13,
            fontWeight: '700',
            color: viewMode === 'all_clinicians' ? colors.white : colors.textSecondary,
          }}>
            Clinicians
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
            placeholder={searchPlaceholder}
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
                Switch to Clinicians to find colleagues
              </Text>
            </View>
          }
          renderItem={renderConnection}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
            <CliniciansDisplayToggle value={cliniciansDisplay} onChange={setCliniciansDisplay} />
          </View>
          {cliniciansDisplay === 'map' ? (
            <CliniciansMap
              clinicians={filteredClinicians}
              onPinPress={(id) => router.push(`/clinician?userId=${id}` as any)}
            />
          ) : (
            <FlatList
              data={filteredClinicians}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}
              ListHeaderComponent={<InviteCTA />}
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
      )}
    </View>
  )
}

// ─── Clinicians list/map display toggle ──────────────────

function CliniciansDisplayToggle({
  value,
  onChange,
}: {
  value: CliniciansDisplay
  onChange: (v: CliniciansDisplay) => void
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 3,
        alignSelf: 'flex-start',
      }}
    >
      {(['list', 'map'] as const).map((v) => {
        const active = value === v
        return (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: active ? colors.teal : 'transparent',
            }}
          >
            {v === 'list' ? (
              <ListIcon size={14} color={active ? colors.white : colors.textSecondary} />
            ) : (
              <MapIcon size={14} color={active ? colors.white : colors.textSecondary} />
            )}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: active ? colors.white : colors.textSecondary,
              }}
            >
              {v === 'list' ? 'List' : 'Map'}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Clinicians map view ─────────────────────────────────
// Uses state centroids as approximate marker positions, since fg_profiles
// doesn't currently store lat/lng. Web version uses a geocoded API; mobile
// approximates until a geocoded DB column lands.

const US_STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  AL: { lat: 32.806671, lng: -86.79113 }, AK: { lat: 61.370716, lng: -152.404419 },
  AZ: { lat: 33.729759, lng: -111.431221 }, AR: { lat: 34.969704, lng: -92.373123 },
  CA: { lat: 36.116203, lng: -119.681564 }, CO: { lat: 39.059811, lng: -105.311104 },
  CT: { lat: 41.597782, lng: -72.755371 }, DE: { lat: 39.318523, lng: -75.507141 },
  FL: { lat: 27.766279, lng: -81.686783 }, GA: { lat: 33.040619, lng: -83.643074 },
  HI: { lat: 21.094318, lng: -157.498337 }, ID: { lat: 44.240459, lng: -114.478828 },
  IL: { lat: 40.349457, lng: -88.986137 }, IN: { lat: 39.849426, lng: -86.258278 },
  IA: { lat: 42.011539, lng: -93.210526 }, KS: { lat: 38.5266, lng: -96.726486 },
  KY: { lat: 37.66814, lng: -84.670067 }, LA: { lat: 31.169546, lng: -91.867805 },
  ME: { lat: 44.693947, lng: -69.381927 }, MD: { lat: 39.063946, lng: -76.802101 },
  MA: { lat: 42.230171, lng: -71.530106 }, MI: { lat: 43.326618, lng: -84.536095 },
  MN: { lat: 45.694454, lng: -93.900192 }, MS: { lat: 32.741646, lng: -89.678696 },
  MO: { lat: 38.456085, lng: -92.288368 }, MT: { lat: 46.921925, lng: -110.454353 },
  NE: { lat: 41.12537, lng: -98.268082 }, NV: { lat: 38.313515, lng: -117.055374 },
  NH: { lat: 43.452492, lng: -71.563896 }, NJ: { lat: 40.298904, lng: -74.521011 },
  NM: { lat: 34.840515, lng: -106.248482 }, NY: { lat: 42.165726, lng: -74.948051 },
  NC: { lat: 35.630066, lng: -79.806419 }, ND: { lat: 47.528912, lng: -99.784012 },
  OH: { lat: 40.388783, lng: -82.764915 }, OK: { lat: 35.565342, lng: -96.928917 },
  OR: { lat: 44.572021, lng: -122.070938 }, PA: { lat: 40.590752, lng: -77.209755 },
  RI: { lat: 41.680893, lng: -71.51178 }, SC: { lat: 33.856892, lng: -80.945007 },
  SD: { lat: 44.299782, lng: -99.438828 }, TN: { lat: 35.747845, lng: -86.692345 },
  TX: { lat: 31.054487, lng: -97.563461 }, UT: { lat: 40.150032, lng: -111.862434 },
  VT: { lat: 44.045876, lng: -72.710686 }, VA: { lat: 37.769337, lng: -78.169968 },
  WA: { lat: 47.400902, lng: -121.490494 }, WV: { lat: 38.491226, lng: -80.954453 },
  WI: { lat: 44.268543, lng: -89.616508 }, WY: { lat: 42.755966, lng: -107.30249 },
  DC: { lat: 38.897438, lng: -77.026817 },
}

function normalizeState(s?: string | null): string | null {
  if (!s) return null
  const trimmed = s.trim().toUpperCase()
  if (US_STATE_CENTROIDS[trimmed]) return trimmed
  // Try full name → abbreviation
  const NAME_TO_CODE: Record<string, string> = {
    ALABAMA: 'AL', ALASKA: 'AK', ARIZONA: 'AZ', ARKANSAS: 'AR', CALIFORNIA: 'CA', COLORADO: 'CO',
    CONNECTICUT: 'CT', DELAWARE: 'DE', FLORIDA: 'FL', GEORGIA: 'GA', HAWAII: 'HI', IDAHO: 'ID',
    ILLINOIS: 'IL', INDIANA: 'IN', IOWA: 'IA', KANSAS: 'KS', KENTUCKY: 'KY', LOUISIANA: 'LA',
    MAINE: 'ME', MARYLAND: 'MD', MASSACHUSETTS: 'MA', MICHIGAN: 'MI', MINNESOTA: 'MN',
    MISSISSIPPI: 'MS', MISSOURI: 'MO', MONTANA: 'MT', NEBRASKA: 'NE', NEVADA: 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', OHIO: 'OH', OKLAHOMA: 'OK', OREGON: 'OR',
    PENNSYLVANIA: 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD',
    TENNESSEE: 'TN', TEXAS: 'TX', UTAH: 'UT', VERMONT: 'VT', VIRGINIA: 'VA', WASHINGTON: 'WA',
    'WEST VIRGINIA': 'WV', WISCONSIN: 'WI', WYOMING: 'WY',
    'DISTRICT OF COLUMBIA': 'DC', 'WASHINGTON DC': 'DC', 'WASHINGTON, DC': 'DC',
  }
  return NAME_TO_CODE[trimmed] || null
}

function CliniciansMap({
  clinicians,
  onPinPress,
}: {
  clinicians: Clinician[]
  onPinPress: (id: string) => void
}) {
  // Group clinicians by state and jitter pins slightly so overlap is visible
  const pins = clinicians
    .map((c) => {
      const code = normalizeState(c.location_state)
      if (!code) return null
      const base = US_STATE_CENTROIDS[code]
      // deterministic jitter so the same clinician renders in the same spot
      const hash = c.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
      const jitterLat = ((hash % 100) / 100 - 0.5) * 0.8
      const jitterLng = (((hash * 7) % 100) / 100 - 0.5) * 0.8
      return {
        id: c.id,
        name: c.full_name,
        license: c.license_type,
        city: c.location_city,
        state: code,
        lat: base.lat + jitterLat,
        lng: base.lng + jitterLng,
      }
    })
    .filter((p): p is NonNullable<typeof p> => !!p)

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 39.8283,
          longitude: -98.5795,
          latitudeDelta: 40,
          longitudeDelta: 50,
        }}
      >
        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.name}
            description={[p.license, [p.city, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
            onCalloutPress={() => onPinPress(p.id)}
          />
        ))}
      </MapView>
      <View
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          backgroundColor: colors.white,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>
          Pins are approximate (state-level). Tap a pin, then tap the callout to view the profile.
        </Text>
      </View>
    </View>
  )
}
