import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Search, UserPlus, UserCheck, MessageCircle } from 'lucide-react-native'
import { supabase } from '../../src/lib/supabase'
import { colors } from '../../src/lib/colors'
import { useAuth } from '../../src/contexts/auth-context'
import { HeaderBar } from '../../src/components/header-bar'
import { useRouter } from 'expo-router'

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

interface BoardPost {
  id: string
  posting_therapist_id: string
  client_initials: string | null
  presenting_concerns: string[] | null
  insurance_type: string | null
  urgency: string | null
  description: string | null
  status: string
  created_at: string
  poster_name: string | null
}

type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export default function DiscoverScreen() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'clinicians' | 'board'>('clinicians')
  const [connectionMap, setConnectionMap] = useState<Map<string, ConnectionStatus>>(new Map())
  const [connectingId, setConnectingId] = useState<string | null>(null)

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
    fetchClinicians()
    fetchBoardPosts()
    fetchConnectionStatuses()
  }, [fetchConnectionStatuses])

  const fetchClinicians = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('fg_profiles')
      .select('id, full_name, license_type, location_city, location_state, avatar_url, accepting_new_clients, telehealth_available, trust_score, bio')
      .eq('onboarding_completed', true)
      .eq('status', 'active')
      .order('trust_score', { ascending: false })
      .limit(50)

    if (data) setClinicians(data)
    setLoading(false)
  }

  const fetchBoardPosts = async () => {
    const { data } = await supabase
      .from('fg_marketplace_posts')
      .select('id, posting_therapist_id, client_initials, presenting_concerns, insurance_type, urgency, description, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50)

    if (data && data.length > 0) {
      const posterIds = [...new Set(data.map(p => p.posting_therapist_id))]
      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name')
        .in('id', posterIds)

      const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]) ?? [])

      setBoardPosts(data.map(p => ({
        ...p,
        poster_name: nameMap.get(p.posting_therapist_id) ?? null,
      })))
    } else {
      setBoardPosts([])
    }
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
      // Update local map
      setConnectionMap(prev => {
        const next = new Map(prev)
        next.set(clinicianId, 'pending_sent')
        return next
      })
      Alert.alert('Request Sent', `Connection request sent to ${clinicianName}.`)
    }
    setConnectingId(null)
  }

  const handleClinicianTap = (item: Clinician) => {
    router.push(`/clinician?userId=${item.id}` as any)
    return
    // Below code kept for reference but no longer used
    const status = connectionMap.get(item.id) ?? 'none'
    const isSelf = item.id === user?.id

    const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }> = []

    // Build detail text
    const details: string[] = []
    if (item.license_type) details.push(item.license_type)
    if (item.location_city || item.location_state) {
      details.push([item.location_city, item.location_state].filter(Boolean).join(', '))
    }
    if (item.bio) details.push('\n' + item.bio)

    const badges: string[] = []
    if (item.accepting_new_clients) badges.push('Accepting New Clients')
    if (item.telehealth_available) badges.push('Telehealth Available')
    if (badges.length > 0) details.push('\n' + badges.join(' | '))

    if (!isSelf) {
      if (status === 'accepted') {
        buttons.push({
          text: 'Message',
          onPress: () => router.push(`/messages?userId=${item.id}` as any),
        })
      } else if (status === 'none') {
        buttons.push({
          text: 'Connect',
          onPress: () => handleConnect(item.id, item.full_name),
        })
      }
    }

    buttons.push({ text: 'Close', style: 'cancel' })

    Alert.alert(
      item.full_name,
      details.join('\n') || 'Clinician',
      buttons,
    )
  }

  const filtered = clinicians.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.license_type?.toLowerCase().includes(q) ||
      c.location_city?.toLowerCase().includes(q) ||
      c.location_state?.toLowerCase().includes(q)
    )
  })

  const filteredPosts = boardPosts.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.client_initials?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.presenting_concerns?.some(c => c.toLowerCase().includes(q)) ||
      p.poster_name?.toLowerCase().includes(q)
    )
  })

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      {/* Search */}
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
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
            placeholder="Search by name, license, city..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, padding: 14, fontSize: 15, color: colors.textPrimary, letterSpacing: 0 }}
          />
        </View>
      </View>

      {/* Toggle Row */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 8,
      }}>
        <TouchableOpacity
          onPress={() => setActiveTab('clinicians')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: activeTab === 'clinicians' ? colors.teal : colors.white,
            borderWidth: 1,
            borderColor: activeTab === 'clinicians' ? colors.teal : colors.border,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: activeTab === 'clinicians' ? colors.white : colors.textSecondary,
          }}>
            Clinicians
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('board')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: activeTab === 'board' ? colors.teal : colors.white,
            borderWidth: 1,
            borderColor: activeTab === 'board' ? colors.teal : colors.border,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: activeTab === 'board' ? colors.white : colors.textSecondary,
          }}>
            Board
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : activeTab === 'clinicians' ? (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListHeaderComponent={<InviteCTA />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>No clinicians found</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Try a different search</Text>
            </View>
          }
          renderItem={({ item }) => (
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
          )}
        />
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>No board posts yet</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Referral opportunities will appear here</Text>
            </View>
          }
          renderItem={({ item }) => {
            const urgencyStyle = item.urgency?.toLowerCase() === 'high'
              ? { bg: '#fef2f2', text: '#dc2626' }
              : item.urgency?.toLowerCase() === 'medium'
              ? { bg: '#fffbeb', text: '#d97706' }
              : { bg: '#f0fdf4', text: '#16a34a' }

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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 }}>
                    Client: {item.client_initials ?? 'N/A'}
                  </Text>
                  {item.urgency ? (
                    <View style={{
                      backgroundColor: urgencyStyle.bg,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: urgencyStyle.text }}>
                        {item.urgency}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {item.description ? (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                {item.presenting_concerns && item.presenting_concerns.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {item.presenting_concerns.map((concern, i) => (
                      <View key={i} style={{
                        backgroundColor: colors.tealLight,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.teal }}>
                          {concern}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {item.poster_name ?? 'Anonymous'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: 8 }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}
