import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Search } from 'lucide-react-native'
import { supabase } from '../../src/lib/supabase'
import { colors } from '../../src/lib/colors'
import { useAuth } from '../../src/contexts/auth-context'

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

export default function DiscoverScreen() {
  const { profile } = useAuth()
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClinicians()
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

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>
          Find Clinicians
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
          {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Search the network'}
        </Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
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
            style={{ flex: 1, padding: 14, fontSize: 15, color: colors.textPrimary }}
          />
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
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
                {/* Avatar */}
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

                {/* Info */}
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

                {/* Badges */}
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
      )}
    </SafeAreaView>
  )
}
