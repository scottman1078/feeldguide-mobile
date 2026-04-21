import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin, CheckCircle, XCircle, Users, MessageSquare, Send } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/auth-context'
import { useRouter, useLocalSearchParams } from 'expo-router'

export default function ClinicianDetailScreen() {
  const router = useRouter()
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const { profile: myProfile } = useAuth()
  const [clinician, setClinician] = useState<any>(null)
  const [loading, setLoading] = useState(1)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(0)

  const fetchClinician = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('fg_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setClinician(data)

    // Check connection status
    if (myProfile?.id) {
      const { data: conn } = await supabase
        .from('fg_partnerships')
        .select('status')
        .or(`and(requesting_id.eq.${myProfile.id},receiving_id.eq.${userId}),and(requesting_id.eq.${userId},receiving_id.eq.${myProfile.id})`)
        .limit(1)
        .maybeSingle()
      if (conn) setConnectionStatus(conn.status)
    }
    setLoading(0)
  }, [userId, myProfile?.id])

  useEffect(() => { fetchClinician() }, [fetchClinician])

  const handleConnect = async () => {
    if (!myProfile?.id || !userId) return
    setConnecting(1)
    await supabase.from('fg_partnerships').insert({
      requesting_id: myProfile.id,
      receiving_id: userId,
      status: 'pending',
    })
    await supabase.from('fg_notifications').insert({
      user_id: userId,
      type: 'connection_request',
      title: `${myProfile.full_name || 'Someone'} wants to connect`,
      body: `Tap to view and respond`,
    })
    setConnectionStatus('pending')
    setConnecting(0)
  }

  const handleMessage = () => {
    router.push(`/conversation?userId=${userId}&userName=${encodeURIComponent(clinician?.full_name || '')}` as any)
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.teal} />
      </SafeAreaView>
    )
  }

  if (!clinician) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Clinician not found</Text>
      </SafeAreaView>
    )
  }

  const initials = (clinician.full_name || '??').split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  const location = [clinician.location_city, clinician.location_state].filter(Boolean).join(', ')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
          {clinician.full_name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Hero */}
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: colors.tealLight,
            justifyContent: 'center', alignItems: 'center', marginBottom: 12,
          }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.teal }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>{clinician.full_name}</Text>
          {clinician.license_type ? (
            <Text style={{ fontSize: 14, color: colors.teal, fontWeight: '600', marginTop: 4 }}>{clinician.license_type}</Text>
          ) : null}
          {location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>{location}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 }}>
          {connectionStatus === 'accepted' ? (
            <TouchableOpacity
              onPress={handleMessage}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.teal, borderRadius: 12, paddingVertical: 14 }}
            >
              <MessageSquare size={18} color={colors.white} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>Message</Text>
            </TouchableOpacity>
          ) : connectionStatus === 'pending' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textMuted }}>Request Pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleConnect}
              disabled={connecting ? true : false}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.teal, borderRadius: 12, paddingVertical: 14, opacity: connecting ? 0.5 : 1 }}
            >
              <Users size={18} color={colors.white} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Badges */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 20 }}>
          {clinician.accepting_new_clients ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <CheckCircle size={14} color="#16a34a" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#16a34a' }}>Accepting</Text>
            </View>
          ) : null}
          {clinician.telehealth_available ? (
            <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563eb' }}>Telehealth</Text>
            </View>
          ) : null}
          {clinician.direct_pay ? (
            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#d97706' }}>Direct Pay</Text>
            </View>
          ) : null}
          {clinician.sliding_scale ? (
            <View style={{ backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#9333ea' }}>Sliding Scale</Text>
            </View>
          ) : null}
        </View>

        {/* Bio */}
        {clinician.bio ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>About</Text>
            <View style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>{clinician.bio}</Text>
            </View>
          </View>
        ) : null}

        {/* Practice */}
        {clinician.practice_name ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Practice</Text>
            <View style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>{clinician.practice_name}</Text>
              {clinician.practice_type ? (
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' }}>{clinician.practice_type} Practice</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Session Rates */}
        {(clinician.session_rate_min || clinician.session_rate_max) ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Session Rate</Text>
            <View style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.teal }}>
                ${clinician.session_rate_min || '?'} - ${clinician.session_rate_max || '?'} / session
              </Text>
            </View>
          </View>
        ) : null}

        {/* Contact */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Contact</Text>
          <View style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
            {clinician.email ? (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${clinician.email}`)}>
                <Text style={{ fontSize: 14, color: colors.teal, marginBottom: 8 }}>{clinician.email}</Text>
              </TouchableOpacity>
            ) : null}
            {clinician.phone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${clinician.phone}`)}>
                <Text style={{ fontSize: 14, color: colors.teal }}>{clinician.phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
