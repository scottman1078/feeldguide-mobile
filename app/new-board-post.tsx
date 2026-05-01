import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, Clock, AlertTriangle, AlertCircle } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/auth-context'

type Urgency = 'routine' | 'urgent' | 'crisis'
// Mirrors the web wizard's 3-destination picker.
type Destination = 'one-person' | 'network' | 'outside'

interface ConnectionOption {
  id: string
  full_name: string
}

const URGENCY_OPTIONS: { value: Urgency; label: string; Icon: typeof Clock; color: string }[] = [
  { value: 'routine', label: 'Routine', Icon: Clock, color: '#2563eb' },
  { value: 'urgent', label: 'Urgent', Icon: AlertTriangle, color: '#d97706' },
  { value: 'crisis', label: 'Crisis', Icon: AlertCircle, color: '#dc2626' },
]

const DESTINATION_OPTIONS: { value: Destination; title: string; subtitle: string }[] = [
  {
    value: 'one-person',
    title: '1 person in my network',
    subtitle: 'Send directly to one connected clinician',
  },
  {
    value: 'network',
    title: 'Everyone in my network',
    subtitle: 'First connection to accept claims it',
  },
  {
    value: 'outside',
    title: 'Outside my network',
    subtitle: 'Posted to the Referral Board for non-connections',
  },
]

export default function NewBoardPostScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [clientInitials, setClientInitials] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('routine')
  const [concerns, setConcerns] = useState('')
  const [insurance, setInsurance] = useState('')
  const [description, setDescription] = useState('')
  const [destination, setDestination] = useState<Destination>('outside')
  const [connections, setConnections] = useState<ConnectionOption[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')
  const [hipaaConfirmed, setHipaaConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load connections for the 1-person picker.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('fg_partnerships')
        .select('requesting_id, receiving_id')
        .or(`requesting_id.eq.${user.id},receiving_id.eq.${user.id}`)
        .in('status', ['accepted', 'active'])
      if (!data || cancelled) return
      const otherIds = data
        .map((p: { requesting_id: string; receiving_id: string }) =>
          p.requesting_id === user.id ? p.receiving_id : p.requesting_id
        )
        .filter(Boolean)
      if (otherIds.length === 0) {
        setConnections([])
        return
      }
      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name')
        .in('id', otherIds)
      if (cancelled) return
      setConnections(
        (profiles || []).map((p: { id: string; full_name: string }) => ({
          id: p.id,
          full_name: p.full_name || 'Unknown',
        }))
      )
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const canSubmit =
    !submitting &&
    (clientInitials.trim().length > 0 || concerns.trim().length > 0 || description.trim().length > 0) &&
    (destination === 'one-person'
      ? !!selectedConnectionId
      : hipaaConfirmed)

  async function handleSubmit() {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in to post a referral.')
      return
    }
    // 1-person flow doesn't need the PHI ack (the receiver is a known
    // connection and notes aren't published to a board), but does need a
    // selected connection.
    if (destination === 'one-person' && !selectedConnectionId) {
      Alert.alert('Pick a clinician', 'Select who in your network should receive this referral.')
      return
    }
    if (destination !== 'one-person' && !hipaaConfirmed) {
      Alert.alert('HIPAA acknowledgement required', 'Confirm the HIPAA notice before posting.')
      return
    }

    setSubmitting(true)
    try {
      // Run the PHI check on description if present (uses the web API — shared across platforms)
      if (description.trim()) {
        try {
          const res = await fetch('https://www.feeldguide.com/api/hipaa-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: description.trim() }),
          })
          const phi = await res.json()
          if (phi?.safe === false) {
            const issues = (phi.issues || []).join('\n• ')
            Alert.alert(
              'PHI detected',
              `Please revise before posting:\n\n• ${issues || 'Description may contain protected health information.'}`
            )
            setSubmitting(false)
            return
          }
        } catch {
          // Non-fatal — proceed if the check is unavailable
        }
      }

      const concernsArr = concerns
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      if (destination === 'one-person') {
        // Direct 1-to-1 referral — creates an fg_referrals row that lands
        // in the receiver's My Referrals → Received with stage='referral_sent'.
        const { error } = await supabase.from('fg_referrals').insert({
          from_therapist_id: user.id,
          to_therapist_id: selectedConnectionId,
          client_initials: (clientInitials.trim() || '??').toUpperCase(),
          presenting_concerns: concernsArr.length > 0 ? concernsArr : [],
          insurance_type: insurance.trim() || null,
          urgency,
          age_group: 'Adult',
          notes: description.trim() || null,
          stage: 'referral_sent',
        })
        if (error) throw error
      } else {
        // expires_at — 72h for network posts (FCFS time-sensitive), 7d for
        // outside-network posts. Mirrors the web wizard.
        const expiresAt = new Date(
          Date.now() + (destination === 'network' ? 72 : 168) * 60 * 60 * 1000
        ).toISOString()

        const { error } = await supabase.from('fg_marketplace_posts').insert({
          posting_therapist_id: user.id,
          client_initials: clientInitials.trim() || null,
          presenting_concerns: concernsArr.length > 0 ? concernsArr : null,
          insurance_type: insurance.trim() || null,
          urgency,
          age_group: 'Adult',
          description: description.trim() || null,
          visibility: destination === 'network' ? 'network' : 'public',
          status: 'open',
          expires_at: expiresAt,
        })
        if (error) throw error
      }

      router.back()
    } catch (err: any) {
      console.error('[new-board-post] insert error:', err)
      Alert.alert('Could not post', err?.message || 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
          Post a Referral
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        {/* HIPAA banner */}
        <View
          style={{
            backgroundColor: '#fef3c7',
            borderWidth: 1,
            borderColor: '#fde68a',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 6 }}>
            HIPAA notice
          </Text>
          <Text style={{ fontSize: 12, color: '#78350f', lineHeight: 18 }}>
            Never post protected health information (PHI). Use initials only, describe presenting
            concerns in general terms, and omit any identifying details. Confirm below to post.
          </Text>
        </View>

        {/* Client initials */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
          Client Initials
        </Text>
        <TextInput
          value={clientInitials}
          onChangeText={(v) => setClientInitials(v.toUpperCase().slice(0, 4))}
          placeholder="J.D."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: colors.textPrimary,
            backgroundColor: colors.white,
            marginBottom: 16,
          }}
        />

        {/* Urgency */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
          Urgency
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {URGENCY_OPTIONS.map(({ value, label, Icon, color }) => {
            const active = urgency === value
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setUrgency(value)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? color : colors.border,
                  backgroundColor: active ? color + '15' : colors.white,
                }}
              >
                <Icon size={14} color={active ? color : colors.textMuted} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: active ? color : colors.textSecondary,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Presenting concerns */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
          Presenting Concerns
        </Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>
          Comma-separated (e.g. anxiety, trauma, CBT)
        </Text>
        <TextInput
          value={concerns}
          onChangeText={setConcerns}
          placeholder="Anxiety, depression, life transitions"
          placeholderTextColor={colors.textMuted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: colors.textPrimary,
            backgroundColor: colors.white,
            marginBottom: 16,
          }}
        />

        {/* Insurance */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
          Insurance
        </Text>
        <TextInput
          value={insurance}
          onChangeText={setInsurance}
          placeholder="Aetna, BCBS, Self-pay"
          placeholderTextColor={colors.textMuted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: colors.textPrimary,
            backgroundColor: colors.white,
            marginBottom: 16,
          }}
        />

        {/* Description */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Brief context without any identifying info."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: colors.textPrimary,
            backgroundColor: colors.white,
            minHeight: 90,
            textAlignVertical: 'top',
            marginBottom: 16,
          }}
        />

        {/* Destination — mirrors the web 3-destination picker */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: 8,
          }}
        >
          Where to send this
        </Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {DESTINATION_OPTIONS.map((opt) => {
            const active = destination === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setDestination(opt.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? colors.teal : colors.border,
                  backgroundColor: active ? colors.tealLight ?? '#e0f7f5' : colors.white,
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    marginTop: 2,
                    borderColor: active ? colors.teal : colors.border,
                    backgroundColor: active ? colors.teal : 'transparent',
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: active ? colors.teal : colors.textPrimary,
                    }}
                  >
                    {opt.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textMuted,
                      marginTop: 2,
                      lineHeight: 14,
                    }}
                  >
                    {opt.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Connection picker — only when destination='one-person'. */}
        {destination === 'one-person' && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}
            >
              Pick a clinician
            </Text>
            {connections.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 16 }}>
                You don&apos;t have any connections yet — visit Network to build your referral
                network, then come back to refer to a specific person.
              </Text>
            ) : (
              <View
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.white,
                  maxHeight: 240,
                  overflow: 'hidden',
                }}
              >
                <ScrollView nestedScrollEnabled>
                  {connections.map((c) => {
                    const checked = selectedConnectionId === c.id
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setSelectedConnectionId(c.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          backgroundColor: checked ? colors.tealLight ?? '#e0f7f5' : colors.white,
                        }}
                      >
                        <View
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            borderWidth: 2,
                            borderColor: checked ? colors.teal : colors.border,
                            backgroundColor: checked ? colors.teal : 'transparent',
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: checked ? '700' : '500',
                            color: colors.textPrimary,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {c.full_name}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* HIPAA confirm — not needed for 1-person referrals (the
            recipient is a known connection and there's no public board). */}
        {destination !== 'one-person' && (
        <TouchableOpacity
          onPress={() => setHipaaConfirmed((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: hipaaConfirmed ? colors.teal : colors.border,
              backgroundColor: hipaaConfirmed ? colors.teal : colors.white,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            {hipaaConfirmed ? (
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: '900' }}>✓</Text>
            ) : null}
          </View>
          <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
            I confirm this post contains no PHI or identifying information and complies with HIPAA.
          </Text>
        </TouchableOpacity>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            backgroundColor: canSubmit ? colors.teal : colors.border,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={{ color: colors.white, fontSize: 15, fontWeight: '800' }}>
              {destination === 'one-person'
                ? 'Send Referral'
                : destination === 'network'
                  ? 'Send to my network'
                  : 'Post to board'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
