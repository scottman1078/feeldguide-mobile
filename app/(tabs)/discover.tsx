import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Search, UserPlus } from 'lucide-react-native'
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
}

interface BoardPost {
  id: string
  title: string
  description: string | null
  created_at: string
  poster_id: string
  poster_name: string | null
  status: string
}

export default function DiscoverScreen() {
  const { profile } = useAuth()
  const router = useRouter()
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'clinicians' | 'board'>('clinicians')

  useEffect(() => {
    fetchClinicians()
    fetchBoardPosts()
  }, [])

  const fetchClinicians = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('fg_profiles')
      .select('id, full_name, license_type, location_city, location_state, avatar_url, accepting_new_clients, telehealth_available, trust_score')
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
      .select('id, title, description, created_at, poster_id, poster_name, status')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setBoardPosts(data)
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
      p.title.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )
  })

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
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
                  {item.license_type && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {item.license_type}
                    </Text>
                  )}
                  {(item.location_city || item.location_state) && (
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {[item.location_city, item.location_state].filter(Boolean).join(', ')}
                    </Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  {item.accepting_new_clients && (
                    <View style={{
                      backgroundColor: '#dcfce7',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#16a34a' }}>Accepting</Text>
                    </View>
                  )}
                  {item.telehealth_available && (
                    <View style={{
                      backgroundColor: '#dbeafe',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      marginTop: 4,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#2563eb' }}>Telehealth</Text>
                    </View>
                  )}
                </View>
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
          renderItem={({ item }) => (
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
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                {item.poster_name && (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {item.poster_name}
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: item.poster_name ? 8 : 0 }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
