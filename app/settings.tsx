import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Camera, LogOut } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { supabase } from '../src/lib/supabase'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback, useRef } from 'react'

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']

export default function SettingsScreen() {
  const { profile, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(1)
  const [toast, setToast] = useState('')
  const toastOpacity = useRef(new Animated.Value(0)).current

  // Profile fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [showGenderPicker, setShowGenderPicker] = useState(0)
  const [bio, setBio] = useState('')

  // Practice fields
  const [practiceName, setPracticeName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [telehealthAvailable, setTelehealthAvailable] = useState(0)
  const [acceptingNewClients, setAcceptingNewClients] = useState(0)
  const [directPay, setDirectPay] = useState(0)
  const [slidingScale, setSlidingScale] = useState(0)

  // Session rates
  const [rateMin, setRateMin] = useState('')
  const [rateMax, setRateMax] = useState('')

  // Saving states
  const [savingProfile, setSavingProfile] = useState(0)
  const [savingPractice, setSavingPractice] = useState(0)
  const [savingRates, setSavingRates] = useState(0)

  const showToast = useCallback((message: string) => {
    setToast(message)
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(''))
  }, [toastOpacity])

  const fetchFullProfile = useCallback(async () => {
    if (!profile?.id) return
    try {
      const { data } = await supabase
        .from('fg_profiles')
        .select('full_name, email, phone, gender, bio, practice_name, location_city, location_state, location_zip, telehealth_available, accepting_new_clients, direct_pay, sliding_scale, session_rate_min, session_rate_max')
        .eq('id', profile.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        setPhone(data.phone || '')
        setGender(data.gender || '')
        setBio(data.bio || '')
        setPracticeName(data.practice_name || '')
        setCity(data.location_city || '')
        setState(data.location_state || '')
        setZip(data.location_zip || '')
        setTelehealthAvailable(data.telehealth_available ? 1 : 0)
        setAcceptingNewClients(data.accepting_new_clients ? 1 : 0)
        setDirectPay(data.direct_pay ? 1 : 0)
        setSlidingScale(data.sliding_scale ? 1 : 0)
        setRateMin(data.session_rate_min != null ? String(data.session_rate_min) : '')
        setRateMax(data.session_rate_max != null ? String(data.session_rate_max) : '')
      }
    } catch {
      // silently fail
    } finally {
      setLoading(0)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchFullProfile()
  }, [fetchFullProfile])

  const saveProfileSection = async () => {
    if (!profile?.id) return
    setSavingProfile(1)
    try {
      const { error } = await supabase.from('fg_profiles').update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        gender: gender || null,
        bio: bio.trim() || null,
      }).eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      showToast('Profile saved')
    } catch {
      showToast('Failed to save profile')
    } finally {
      setSavingProfile(0)
    }
  }

  const savePracticeSection = async () => {
    if (!profile?.id) return
    setSavingPractice(1)
    try {
      const { error } = await supabase.from('fg_profiles').update({
        practice_name: practiceName.trim() || null,
        location_city: city.trim() || null,
        location_state: state.trim() || null,
        location_zip: zip.trim() || null,
        telehealth_available: telehealthAvailable ? true : false,
        accepting_new_clients: acceptingNewClients ? true : false,
        direct_pay: directPay ? true : false,
        sliding_scale: slidingScale ? true : false,
      }).eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      showToast('Practice info saved')
    } catch {
      showToast('Failed to save practice info')
    } finally {
      setSavingPractice(0)
    }
  }

  const saveRatesSection = async () => {
    if (!profile?.id) return
    setSavingRates(1)
    try {
      const { error } = await supabase.from('fg_profiles').update({
        session_rate_min: rateMin ? parseInt(rateMin, 10) : null,
        session_rate_max: rateMax ? parseInt(rateMax, 10) : null,
      }).eq('id', profile.id)
      if (error) throw error
      showToast('Rates saved')
    } catch {
      showToast('Failed to save rates')
    } finally {
      setSavingRates(0)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.teal} />
      </SafeAreaView>
    )
  }

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
          Settings
        </Text>
      </View>

      {/* Toast */}
      {toast ? (
        <Animated.View style={{
          position: 'absolute',
          top: 100,
          left: 20,
          right: 20,
          zIndex: 100,
          opacity: toastOpacity,
          backgroundColor: colors.teal,
          borderRadius: 10,
          paddingVertical: 12,
          paddingHorizontal: 16,
          alignItems: 'center',
        }}>
          <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>{toast}</Text>
        </Animated.View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* ==================== PROFILE SECTION ==================== */}
        <SectionLabel text="Profile" />
        <View style={cardStyle}>
          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: colors.tealLight,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: 28, fontWeight: '700', color: colors.teal }}>
                  {fullName ? getInitials(fullName) : '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Camera size={14} color={colors.teal} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.teal, marginLeft: 6 }}>
                Change Photo
              </Text>
            </TouchableOpacity>
          </View>

          <FieldLabel text="Full Name" />
          <StyledInput value={fullName} onChangeText={setFullName} placeholder="Full name" />

          <FieldLabel text="Email" />
          <StyledInput value={email} editable={0} style={{ backgroundColor: '#f1f5f9', color: colors.textMuted }} />

          <FieldLabel text="Phone" />
          <StyledInput value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />

          <FieldLabel text="Gender" />
          <TouchableOpacity
            onPress={() => setShowGenderPicker(showGenderPicker ? 0 : 1)}
            style={[inputStyle, { justifyContent: 'center' }]}
          >
            <Text style={{ fontSize: 15, color: gender ? colors.textPrimary : colors.textMuted }}>
              {gender || 'Select gender'}
            </Text>
          </TouchableOpacity>
          {showGenderPicker ? (
            <View style={{
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              marginTop: 4,
              marginBottom: 8,
              overflow: 'hidden',
            }}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { setGender(opt); setShowGenderPicker(0) }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: gender === opt ? colors.tealLight : colors.white,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 15, color: gender === opt ? colors.teal : colors.textPrimary, fontWeight: gender === opt ? '600' : '400' }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <FieldLabel text="Bio" />
          <StyledInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself..."
            multiline={1}
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
          />

          <SaveButton label="Save Profile" onPress={saveProfileSection} saving={savingProfile} />
        </View>

        {/* ==================== PRACTICE SECTION ==================== */}
        <SectionLabel text="Practice" />
        <View style={cardStyle}>
          <FieldLabel text="Practice Name" />
          <StyledInput value={practiceName} onChangeText={setPracticeName} placeholder="Practice name" />

          <FieldLabel text="City" />
          <StyledInput value={city} onChangeText={setCity} placeholder="City" />

          <FieldLabel text="State" />
          <StyledInput value={state} onChangeText={setState} placeholder="State" autoCapitalize="characters" />

          <FieldLabel text="ZIP Code" />
          <StyledInput value={zip} onChangeText={setZip} placeholder="ZIP code" keyboardType="number-pad" />

          <View style={{ marginTop: 8 }}>
            <ToggleRow label="Telehealth Available" value={telehealthAvailable} onToggle={() => setTelehealthAvailable(telehealthAvailable ? 0 : 1)} />
            <ToggleRow label="Accepting New Clients" value={acceptingNewClients} onToggle={() => setAcceptingNewClients(acceptingNewClients ? 0 : 1)} />
            <ToggleRow label="Direct Pay" value={directPay} onToggle={() => setDirectPay(directPay ? 0 : 1)} />
            <ToggleRow label="Sliding Scale" value={slidingScale} onToggle={() => setSlidingScale(slidingScale ? 0 : 1)} />
          </View>

          <SaveButton label="Save Practice Info" onPress={savePracticeSection} saving={savingPractice} />
        </View>

        {/* ==================== SESSION RATES SECTION ==================== */}
        <SectionLabel text="Session Rates" />
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel text="Min Rate ($)" />
              <StyledInput value={rateMin} onChangeText={setRateMin} placeholder="0" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel text="Max Rate ($)" />
              <StyledInput value={rateMax} onChangeText={setRateMax} placeholder="0" keyboardType="number-pad" />
            </View>
          </View>

          <SaveButton label="Save Rates" onPress={saveRatesSection} saving={savingRates} />
        </View>

        {/* ==================== ACCOUNT SECTION ==================== */}
        <SectionLabel text="Account" />
        <View style={cardStyle}>
          <TouchableOpacity
            onPress={signOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#fecaca',
              paddingVertical: 14,
              paddingHorizontal: 24,
            }}
          >
            <LogOut size={16} color={colors.destructive} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.destructive, marginLeft: 8 }}>
              Sign Out
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16 }}>
            FeeldGuide v1.0.0
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ==================== Sub-components ====================

const cardStyle = {
  backgroundColor: colors.white,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 18,
  marginBottom: 24,
}

const inputStyle = {
  backgroundColor: colors.background,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: colors.textPrimary,
  marginBottom: 12,
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
      marginTop: 24,
    }}>
      {text}
    </Text>
  )
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
      {text}
    </Text>
  )
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  editable,
  keyboardType,
  multiline,
  numberOfLines,
  autoCapitalize,
  style: extraStyle,
}: {
  value: string
  onChangeText?: (text: string) => void
  placeholder?: string
  editable?: number
  keyboardType?: 'default' | 'phone-pad' | 'number-pad'
  multiline?: number
  numberOfLines?: number
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  style?: Record<string, unknown>
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      editable={editable === 0 ? false : true}
      keyboardType={keyboardType || 'default'}
      multiline={multiline ? true : false}
      numberOfLines={numberOfLines}
      autoCapitalize={autoCapitalize}
      style={[inputStyle, extraStyle]}
    />
  )
}

function ToggleRow({ label, value, onToggle }: { label: string; value: number; onToggle: () => void }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontSize: 15, color: colors.textPrimary, flex: 1 }}>{label}</Text>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          backgroundColor: value ? colors.teal : '#e2e8f0',
          justifyContent: 'center',
          padding: 2,
        }}>
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: 'white',
            transform: [{ translateX: value ? 20 : 0 }],
          }} />
        </View>
      </TouchableOpacity>
    </View>
  )
}

function SaveButton({ label, onPress, saving }: { label: string; onPress: () => void; saving: number }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={saving ? true : false}
      style={{
        backgroundColor: colors.teal,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
        opacity: saving ? 0.6 : 1,
      }}
    >
      {saving ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}
