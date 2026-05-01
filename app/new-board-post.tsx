import { useState } from 'react'
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
// Mirrors the web wizard's destination picker. 'one-person' isn't on
// this screen yet — for direct 1-to-1 referrals, mobile users open a
// clinician's profile and tap Refer.
type Destination = 'network' | 'outside'

const URGENCY_OPTIONS: { value: Urgency; label: string; Icon: typeof Clock; color: string }[] = [
  { value: 'routine', label: 'Routine', Icon: Clock, color: '#2563eb' },
  { value: 'urgent', label: 'Urgent', Icon: AlertTriangle, color: '#d97706' },
  { value: 'crisis', label: 'Crisis', Icon: AlertCircle, color: '#dc2626' },
]

const DESTINATION_OPTIONS: { value: Destination; title: string; subtitle: string }[] = [
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
  const [hipaaConfirmed, setHipaaConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    hipaaConfirmed &&
    !submitting &&
    (clientInitials.trim().length > 0 || concerns.trim().length > 0 || description.trim().length > 0)

  async function handleSubmit() {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in to post a referral.')
      return
    }
    if (!hipaaConfirmed) {
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

        {/* HIPAA confirm */}
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
              Post Referral
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
