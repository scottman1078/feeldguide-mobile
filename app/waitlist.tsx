import { useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Sparkles, MapPin, ShieldCheck, Stethoscope, LogOut } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { shouldHoldOnWaitlist, WAITLIST_MODE } from '../src/lib/waitlist'

export default function WaitlistScreen() {
  const router = useRouter()
  const { profile, signOut } = useAuth()

  // If waitlist mode flips off, or this user becomes admin/allowlisted,
  // bounce them straight to the dashboard.
  useEffect(() => {
    if (!profile) return
    if (!WAITLIST_MODE) {
      router.replace('/(tabs)/feed' as any)
      return
    }
    if (!shouldHoldOnWaitlist({ email: profile.email, isAdmin: !!profile.is_admin })) {
      router.replace('/(tabs)/feed' as any)
    }
  }, [profile, router])

  if (!profile) return null

  const displayName = profile.full_name || profile.email.split('@')[0] || 'Friend'
  const firstName = displayName.split(' ')[0] || displayName
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const locationParts = [profile.location_city, profile.location_state].filter(Boolean)
  const locationText = locationParts.length ? locationParts.join(', ') : null
  const licenseLine = [profile.license_type, (profile as any).license_state]
    .filter(Boolean)
    .join(' · ')

  async function handleSignOut() {
    await signOut()
    router.replace('/(auth)/sign-up' as any)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>FeeldGuide</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn} accessibilityLabel="Sign out">
          <LogOut size={16} color={colors.textSecondary} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroBadge}>
          <Sparkles size={14} color={colors.teal} />
          <Text style={styles.heroBadgeText}>Early access</Text>
        </View>

        <Text style={styles.heroTitle}>Thanks for being early, {firstName}.</Text>
        <Text style={styles.heroBody}>
          We&rsquo;re launching FeeldGuide fully in May. Your spot is saved &mdash; Brian will be in touch along the way as we open the doors to clinicians like you.
        </Text>

        <Text style={styles.sectionLabel}>Your profile preview</Text>
        <Text style={styles.sectionHint}>How you&rsquo;ll appear at launch</Text>

        <View style={styles.card}>
          <View style={styles.cardBanner} />
          <View style={styles.cardBody}>
            <View style={styles.avatarRow}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{initials || '?'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{displayName}</Text>
                {licenseLine ? <Text style={styles.profileSub}>{licenseLine}</Text> : null}
              </View>
            </View>

            <View style={styles.pillRow}>
              {locationText ? (
                <View style={[styles.pill, styles.pillNeutral]}>
                  <MapPin size={11} color={colors.textSecondary} />
                  <Text style={styles.pillText}>{locationText}</Text>
                </View>
              ) : null}
              {profile.user_tier === 'licensed' ? (
                <View style={[styles.pill, styles.pillTeal]}>
                  <ShieldCheck size={11} color={colors.teal} />
                  <Text style={[styles.pillText, { color: colors.teal }]}>Licensed clinician</Text>
                </View>
              ) : null}
              <View style={[styles.pill, styles.pillNeutral]}>
                <Stethoscope size={11} color={colors.textSecondary} />
                <Text style={styles.pillText}>Verified profile</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>What happens next</Text>
          <Bullet text="Brian will reach out personally before launch with first-look access." />
          <Bullet text="Everything you entered is saved — you’re already in the network." />
          <Bullet text="Early adopters get founding-member perks at full launch." />
        </View>

        <Text style={styles.footer}>
          Questions? Reply to any FeeldGuide email and Brian will get back to you.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  brand: { fontSize: 18, fontWeight: '700', color: colors.teal },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signOutText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  scroll: { padding: 20, paddingBottom: 40 },
  heroBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.tealLight,
    borderWidth: 1,
    borderColor: colors.teal,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardBanner: {
    height: 56,
    backgroundColor: colors.tealLight,
  },
  cardBody: { padding: 20, marginTop: -28 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: colors.card,
    backgroundColor: colors.background,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealLight,
  },
  avatarInitials: { color: colors.teal, fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  profileSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillNeutral: { borderColor: colors.border, backgroundColor: colors.background },
  pillTeal: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  pillText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  nextCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
  },
  nextTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
    marginTop: 8,
  },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  footer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
})
