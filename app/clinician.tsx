import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin, CheckCircle, XCircle, Users, MessageSquare, Send, X, Shield } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/auth-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'

const REFERRAL_CONCERN_OPTIONS = [
  'Anxiety', 'Depression', 'Trauma/PTSD', 'Relationship Issues', 'Grief/Loss',
  'Substance Use', 'Eating Disorders', 'OCD', 'ADHD', 'Bipolar',
  'Personality Disorders', 'Child/Adolescent', 'Family Therapy', 'Other',
]

type ReferralUrgency = 'Routine' | 'Urgent' | 'Crisis'

export default function ClinicianDetailScreen() {
  const router = useRouter()
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const { profile: myProfile } = useAuth()
  const [clinician, setClinician] = useState<any>(null)
  const [loading, setLoading] = useState(1)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(0)

  // Send Referral modal state — mirrors the web SendReferralModal flow
  // (locked recipient, opened from a clinician's profile page).
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [referralInitials, setReferralInitials] = useState('')
  const [referralConcerns, setReferralConcerns] = useState<string[]>([])
  const [referralInsurance, setReferralInsurance] = useState('')
  const [referralUrgency, setReferralUrgency] = useState<ReferralUrgency>('Routine')
  const [referralNotes, setReferralNotes] = useState('')
  const [referralPhiAcknowledged, setReferralPhiAcknowledged] = useState(false)
  const [referralSubmitting, setReferralSubmitting] = useState(false)

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

  // Live profile updates — mirrors the web `fg-therapist-profile-${id}` channel
  // so admin/clinician edits to fg_profiles (and the child tables that drive
  // this view) propagate to open viewer sessions without a manual reload.
  // Coalesce rapid bursts of changes into a single refetch ~250ms after the
  // last event.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!userId) return

    const scheduleRefetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
      refetchTimer.current = setTimeout(() => {
        fetchClinician()
      }, 250)
    }

    const channel = supabase
      .channel(`fg-therapist-profile-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fg_profiles', filter: `id=eq.${userId}` },
        scheduleRefetch,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fg_diagnosis_weights', filter: `profile_id=eq.${userId}` },
        scheduleRefetch,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fg_insurance_panels', filter: `profile_id=eq.${userId}` },
        scheduleRefetch,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fg_treatment_modalities', filter: `profile_id=eq.${userId}` },
        scheduleRefetch,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fg_languages', filter: `profile_id=eq.${userId}` },
        scheduleRefetch,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fg_focus_areas', filter: `profile_id=eq.${userId}` },
        scheduleRefetch,
      )
      .subscribe()

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
      supabase.removeChannel(channel)
    }
  }, [userId, fetchClinician])

  // Belt-and-suspenders: refetch when the screen regains focus (e.g. user
  // navigates back from another screen) — mobile equivalent of the web
  // `window.focus` / `visibilitychange` listeners.
  useFocusEffect(
    useCallback(() => {
      fetchClinician()
    }, [fetchClinician]),
  )

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

  const resetReferralForm = () => {
    setReferralInitials('')
    setReferralConcerns([])
    setReferralInsurance('')
    setReferralUrgency('Routine')
    setReferralNotes('')
    setReferralPhiAcknowledged(false)
  }

  const toggleReferralConcern = (concern: string) => {
    setReferralConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern],
    )
  }

  const handleSendReferral = async () => {
    if (!userId) return
    if (!referralInitials.trim()) {
      Alert.alert('Missing Info', 'Please enter client initials.')
      return
    }
    if (referralConcerns.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one client concern.')
      return
    }
    if (!referralPhiAcknowledged) {
      Alert.alert('PHI Acknowledgment', 'Please acknowledge the PHI disclaimer before submitting.')
      return
    }

    setReferralSubmitting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch('https://www.feeldguide.com/api/referrals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          toTherapistId: userId,
          clientInitials: referralInitials.trim().toUpperCase(),
          presentingConcerns: referralConcerns,
          insurance: referralInsurance.trim() || null,
          urgency: referralUrgency.toLowerCase(),
          notes: referralNotes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        Alert.alert('Could not send referral', data.error || 'Please try again.')
        return
      }

      setShowReferralModal(false)
      resetReferralForm()
      Alert.alert('Referral Sent', `Referral sent to ${clinician?.full_name || 'this clinician'}.`)
    } catch (err) {
      Alert.alert(
        "Couldn't send referral",
        err instanceof Error ? err.message : 'Please try again.',
      )
    } finally {
      setReferralSubmitting(false)
    }
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
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12 }}>
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

        {/* Refer a Client — mirrors the web "Refer a Client to {firstName}" CTA */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setShowReferralModal(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.teal, borderRadius: 12, paddingVertical: 14, backgroundColor: colors.white }}
          >
            <Send size={18} color={colors.teal} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.teal }}>
              Refer a Client to {(clinician?.full_name || '').split(' ')[0] || 'this clinician'}
            </Text>
          </TouchableOpacity>
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

      {/* Send Referral Modal — locked recipient (this clinician). */}
      <Modal
        visible={showReferralModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReferralModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <TouchableOpacity onPress={() => setShowReferralModal(false)} style={{ marginRight: 12 }}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                Refer to {clinician?.full_name || 'this clinician'}
              </Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {/* PHI Notice */}
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                <Shield size={16} color="#b45309" style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 }}>
                  Use initials only — do not include patient full names, DOB, or other identifying information in referrals.
                </Text>
              </View>

              {/* Client Initials */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>Client Initials *</Text>
              <TextInput
                value={referralInitials}
                onChangeText={(t) => setReferralInitials(t.toUpperCase())}
                placeholder="e.g. JD"
                placeholderTextColor={colors.textMuted}
                maxLength={3}
                autoCapitalize="characters"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, marginBottom: 20, backgroundColor: colors.white, width: 120 }}
              />

              {/* Concerns */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Presenting Concerns *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {REFERRAL_CONCERN_OPTIONS.map((concern) => {
                  const selected = referralConcerns.includes(concern)
                  return (
                    <TouchableOpacity
                      key={concern}
                      onPress={() => toggleReferralConcern(concern)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: selected ? colors.teal : colors.border,
                        backgroundColor: selected ? colors.tealLight : colors.white,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? colors.teal : colors.textSecondary }}>{concern}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Insurance */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>Insurance</Text>
              <TextInput
                value={referralInsurance}
                onChangeText={setReferralInsurance}
                placeholder="Aetna, BCBS, etc."
                placeholderTextColor={colors.textMuted}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, marginBottom: 20, backgroundColor: colors.white }}
              />

              {/* Urgency */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Urgency</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {(['Routine', 'Urgent', 'Crisis'] as ReferralUrgency[]).map((u) => {
                  const selected = referralUrgency === u
                  const dot = u === 'Crisis' ? '#dc2626' : u === 'Urgent' ? '#d97706' : '#16a34a'
                  return (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setReferralUrgency(u)}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        paddingVertical: 10, borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selected ? colors.teal : colors.border,
                        backgroundColor: selected ? colors.tealLight : colors.white,
                      }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? colors.teal : colors.textSecondary }}>{u}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Notes */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>Additional context</Text>
              <TextInput
                value={referralNotes}
                onChangeText={setReferralNotes}
                placeholder="Any context that helps the receiving clinician..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, marginBottom: 20, backgroundColor: colors.white, minHeight: 90, textAlignVertical: 'top' }}
              />

              {/* PHI Acknowledgment */}
              <TouchableOpacity
                onPress={() => setReferralPhiAcknowledged(!referralPhiAcknowledged)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                  borderColor: referralPhiAcknowledged ? colors.teal : colors.border,
                  backgroundColor: referralPhiAcknowledged ? colors.teal : colors.white,
                  alignItems: 'center', justifyContent: 'center', marginTop: 2,
                }}>
                  {referralPhiAcknowledged ? <CheckCircle size={14} color={colors.white} /> : null}
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                  I acknowledge that this referral contains no full names, DOB, or other PHI beyond what is necessary for routing.
                </Text>
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSendReferral}
                disabled={referralSubmitting}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: colors.teal, borderRadius: 12, paddingVertical: 14,
                  opacity: referralSubmitting ? 0.6 : 1,
                }}
              >
                {referralSubmitting
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Send size={18} color={colors.white} />}
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>
                  {referralSubmitting ? 'Sending…' : 'Send Referral'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
