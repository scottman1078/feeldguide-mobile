import { View, Text, TouchableOpacity, ScrollView, Linking, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, ExternalLink, CheckCircle, XCircle } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { supabase } from '../src/lib/supabase'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'

interface FullProfile {
  full_name: string | null
  avatar_url: string | null
  email: string | null
  phone: string | null
  license_type: string | null
  license_number: string | null
  license_state: string | null
  npi_number: string | null
  location_city: string | null
  location_state: string | null
  location_zip: string | null
  practice_name: string | null
  practice_type: string | null
  years_in_practice: number | null
  bio: string | null
  trust_score: number | null
  user_tier: string | null
  accepting_new_clients: boolean | null
  telehealth_available: boolean | null
  direct_pay: boolean | null
  accepts_insurance: boolean | null
  sliding_scale: boolean | null
  session_rate_min: number | null
  session_rate_max: number | null
  is_supervisor: boolean | null
  supervision_philosophy: string | null
}

interface DiagnosisWeight {
  id: string
  name: string
  weight: number
}

interface TreatmentModality {
  id: string
  name: string
}

interface InsurancePanel {
  id: string
  name: string
}

interface Language {
  id: string
  name: string
}

export default function ProfileScreen() {
  const { profile: authProfile } = useAuth()
  const router = useRouter()
  const [fullProfile, setFullProfile] = useState<FullProfile | null>(null)
  const [diagnoses, setDiagnoses] = useState<DiagnosisWeight[]>([])
  const [modalities, setModalities] = useState<TreatmentModality[]>([])
  const [insurancePanels, setInsurancePanels] = useState<InsurancePanel[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(1)

  const fetchAllData = useCallback(async () => {
    if (!authProfile?.id) return
    const userId = authProfile.id

    try {
      const [profileRes, diagRes, modalRes, insRes, langRes] = await Promise.all([
        supabase
          .from('fg_profiles')
          .select('full_name, avatar_url, email, phone, license_type, license_number, license_state, npi_number, location_city, location_state, location_zip, practice_name, practice_type, years_in_practice, bio, trust_score, user_tier, accepting_new_clients, telehealth_available, direct_pay, accepts_insurance, sliding_scale, session_rate_min, session_rate_max, is_supervisor, supervision_philosophy')
          .eq('id', userId)
          .single(),
        supabase
          .from('fg_diagnosis_weights')
          .select('id, name, weight')
          .eq('profile_id', userId)
          .gte('weight', 75)
          .order('weight', { ascending: false }),
        supabase
          .from('fg_treatment_modalities')
          .select('id, name')
          .eq('profile_id', userId),
        supabase
          .from('fg_insurance_panels')
          .select('id, name')
          .eq('profile_id', userId),
        supabase
          .from('fg_languages')
          .select('id, name')
          .eq('profile_id', userId),
      ])

      if (profileRes.data) setFullProfile(profileRes.data as FullProfile)
      if (diagRes.data) setDiagnoses(diagRes.data as DiagnosisWeight[])
      if (modalRes.data) setModalities(modalRes.data as TreatmentModality[])
      if (insRes.data) setInsurancePanels(insRes.data as InsurancePanel[])
      if (langRes.data) setLanguages(langRes.data as Language[])
    } catch {
      // silently fail
    } finally {
      setLoading(0)
    }
  }, [authProfile?.id])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

  const p = fullProfile

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.teal} />
      </SafeAreaView>
    )
  }

  const location = [p?.location_city, p?.location_state].filter(Boolean).join(', ')
  const hasRates = p?.session_rate_min != null || p?.session_rate_max != null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.white,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginLeft: 12 }}>
          My Profile
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Hero section */}
        <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 20, paddingHorizontal: 20 }}>
          {/* Avatar */}
          {p?.avatar_url ? (
            <Image
              source={{ uri: p.avatar_url }}
              style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 16 }}
            />
          ) : (
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: colors.tealLight,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 36, fontWeight: '700', color: colors.teal }}>
                {p?.full_name ? getInitials(p.full_name) : '?'}
              </Text>
            </View>
          )}

          {/* Name + credentials */}
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>
            {p?.full_name || 'Unknown'}
          </Text>
          {p?.license_type ? (
            <Text style={{ fontSize: 15, color: colors.teal, fontWeight: '600', marginTop: 4, textAlign: 'center' }}>
              {p.license_type}
            </Text>
          ) : null}
          {location ? (
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
              {location}
            </Text>
          ) : null}

          {/* Tier + Trust */}
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            <View style={{
              backgroundColor: colors.tealLight,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 5,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal, textTransform: 'uppercase' }}>
                {p?.user_tier || 'free'}
              </Text>
            </View>
            <View style={{
              backgroundColor: '#fef3c7',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 5,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.amber }}>
                Trust: {p?.trust_score ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        {p?.bio ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="About" />
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                {p.bio}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* Practice Info */}
        {(p?.practice_name || p?.practice_type || p?.years_in_practice != null) ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="Practice" />
              {p?.practice_name ? <InfoRow label="Practice Name" value={p.practice_name} /> : null}
              {p?.practice_type ? <InfoRow label="Practice Type" value={p.practice_type} /> : null}
              {p?.years_in_practice != null ? <InfoRow label="Years in Practice" value={String(p.years_in_practice)} /> : null}
            </Card>
          </View>
        ) : null}

        {/* Status Badges */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Card>
            <SectionHeader title="Availability" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <StatusBadge label="Accepting Clients" active={p?.accepting_new_clients} />
              <StatusBadge label="Telehealth" active={p?.telehealth_available} />
              <StatusBadge label="Direct Pay" active={p?.direct_pay} />
              <StatusBadge label="Insurance" active={p?.accepts_insurance} />
              <StatusBadge label="Sliding Scale" active={p?.sliding_scale} />
            </View>
          </Card>
        </View>

        {/* Session Rates */}
        {hasRates ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="Session Rates" />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>
                ${p?.session_rate_min ?? '—'} – ${p?.session_rate_max ?? '—'}
                <Text style={{ fontSize: 14, fontWeight: '400', color: colors.textSecondary }}>
                  {' / session'}
                </Text>
              </Text>
            </Card>
          </View>
        ) : null}

        {/* Licensing */}
        {(p?.license_number || p?.license_state || p?.npi_number) ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="Licensing" />
              {p?.license_number ? <InfoRow label="License #" value={p.license_number} /> : null}
              {p?.license_state ? <InfoRow label="License State" value={p.license_state} /> : null}
              {p?.npi_number ? <InfoRow label="NPI Number" value={p.npi_number} /> : null}
            </Card>
          </View>
        ) : null}

        {/* Contact */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Card>
            <SectionHeader title="Contact" />
            <InfoRow label="Email" value={p?.email || '—'} />
            {p?.phone ? <InfoRow label="Phone" value={p.phone} /> : null}
            {p?.location_zip ? <InfoRow label="ZIP" value={p.location_zip} /> : null}
          </Card>
        </View>

        {/* Clinical Interests */}
        {diagnoses.length > 0 ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="Clinical Interests" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {diagnoses.map(d => (
                  <PillBadge key={d.id} label={d.name} color={colors.teal} bgColor={colors.tealLight} />
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* Treatment Modalities */}
        {modalities.length > 0 ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="Treatment Modalities" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {modalities.map(m => (
                  <PillBadge key={m.id} label={m.name} color={colors.navy} bgColor="#f1f5f9" />
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* Insurance Panels */}
        {insurancePanels.length > 0 ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="Insurance Panels" />
              {insurancePanels.map(ip => (
                <View key={ip.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}>
                  <View style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.teal,
                    marginRight: 10,
                  }} />
                  <Text style={{ fontSize: 14, color: colors.textPrimary }}>{ip.name}</Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Languages */}
        {languages.length > 0 ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="Languages" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {languages.map(l => (
                  <PillBadge key={l.id} label={l.name} color="#7c3aed" bgColor="#f5f3ff" />
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* Supervision */}
        {p?.is_supervisor ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Card>
              <SectionHeader title="Supervision" />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: p?.supervision_philosophy ? 10 : 0 }}>
                <CheckCircle size={16} color={colors.green} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginLeft: 8 }}>
                  Available as Supervisor
                </Text>
              </View>
              {p?.supervision_philosophy ? (
                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                  {p.supervision_philosophy}
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        {/* Edit on Web */}
        <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://feeldguide.com/dashboard/settings')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.teal,
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 24,
              width: '100%',
            }}
          >
            <ExternalLink size={18} color={colors.white} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white, marginLeft: 10 }}>
              Edit Profile on Web
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// --- Shared Components ---

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: colors.white,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    }}>
      {children}
    </View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 12,
    }}>
      {title}
    </Text>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, flexShrink: 1, textAlign: 'right', marginLeft: 16 }}>
        {value}
      </Text>
    </View>
  )
}

function StatusBadge({ label, active }: { label: string; active: boolean | null | undefined }) {
  const isActive = active === true || active === 1
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    }}>
      {isActive ? (
        <CheckCircle size={14} color={colors.green} />
      ) : (
        <XCircle size={14} color={colors.destructive} />
      )}
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        color: isActive ? colors.green : colors.destructive,
        marginLeft: 5,
      }}>
        {label}
      </Text>
    </View>
  )
}

function PillBadge({ label, color, bgColor }: { label: string; color: string; bgColor: string }) {
  return (
    <View style={{
      backgroundColor: bgColor,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color }}>
        {label}
      </Text>
    </View>
  )
}
