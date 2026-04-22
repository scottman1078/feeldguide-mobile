import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { Clock, AlertTriangle, CreditCard } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { colors } from '../lib/colors'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000))
}

/**
 * Countdown banner — mobile mirror of the web sidebar banner.
 * Renders above the tab Slot. Three states: trialing / cancel-at-period-end /
 * fully expired. Hidden on a healthy paid subscription.
 */
export function TrialBanner() {
  const { profile, refreshProfile } = useAuth()
  const router = useRouter()
  const [resuming, setResuming] = useState(false)
  if (!profile) return null

  const status = profile.subscription_status || 'trialing'

  // ── Canceled-at-period-end ──
  if (status === 'active' && profile.cancel_at_period_end && profile.base_period_end) {
    const days = daysUntil(profile.base_period_end)
    if (days === null) return null
    const tone: 'warn' | 'danger' = days <= 3 ? 'danger' : 'warn'
    const bg = tone === 'danger' ? '#FEF2F2' : '#FFFBEB'
    const border = tone === 'danger' ? '#FECACA' : '#FDE68A'
    const headline = tone === 'danger' ? '#B91C1C' : '#92400E'
    const ctaColor = tone === 'danger' ? '#DC2626' : '#D97706'

    async function handleResume() {
      setResuming(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return
        const res = await fetch('https://www.feeldguide.com/api/stripe/resume', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          await refreshProfile()
        } else {
          const data = await res.json().catch(() => ({}))
          Alert.alert('Could not resume', data.error || 'Try again shortly.')
        }
      } finally {
        setResuming(false)
      }
    }

    return (
      <BannerShell bg={bg} border={border}>
        <BannerHeader color={headline} icon={<AlertTriangle size={14} color={headline} />}>
          {days === 0 ? 'Access ends today' : `${days} day${days === 1 ? '' : 's'} until access ends`}
        </BannerHeader>
        <BannerBody color={headline}>Your subscription is set to cancel.</BannerBody>
        <TouchableOpacity
          onPress={handleResume}
          disabled={resuming}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 32,
            borderRadius: 8,
            backgroundColor: ctaColor,
            opacity: resuming ? 0.7 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
            {resuming ? 'Resuming…' : 'Resume subscription'}
          </Text>
        </TouchableOpacity>
      </BannerShell>
    )
  }

  if (status === 'active') return null

  // ── Fully expired / canceled ──
  if (status === 'expired' || status === 'canceled') {
    return (
      <BannerShell bg="#FEF2F2" border="#FECACA">
        <BannerHeader color="#B91C1C" icon={<AlertTriangle size={14} color="#B91C1C" />}>
          Access ended
        </BannerHeader>
        <BannerBody color="#7F1D1D">Add a card to reactivate your access.</BannerBody>
        <TouchableOpacity
          onPress={() => router.push('/reactivate' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#DC2626',
          }}
        >
          <CreditCard size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Reactivate</Text>
        </TouchableOpacity>
      </BannerShell>
    )
  }

  // ── Trialing ──
  const days = daysUntil(profile.trial_ends_at)
  if (days === null) return null

  const withCC = profile.trial_type === 'cc'
  const tone: 'normal' | 'warn' | 'danger' = days <= 3 ? 'danger' : days <= 7 ? 'warn' : 'normal'
  const bg = tone === 'danger' ? '#FEF2F2' : tone === 'warn' ? '#FFFBEB' : colors.tealLight
  const border = tone === 'danger' ? '#FECACA' : tone === 'warn' ? '#FDE68A' : colors.tealLight
  const headline = tone === 'danger' ? '#B91C1C' : tone === 'warn' ? '#92400E' : colors.teal
  const ctaColor = tone === 'danger' ? '#DC2626' : tone === 'warn' ? '#D97706' : colors.teal

  return (
    <BannerShell bg={bg} border={border}>
      <BannerHeader
        color={headline}
        icon={tone === 'danger' ? <AlertTriangle size={14} color={headline} /> : <Clock size={14} color={headline} />}
      >
        {days === 0 ? 'Trial ends today' : `${days} day${days === 1 ? '' : 's'} left on trial`}
      </BannerHeader>
      {!withCC && (
        <>
          <BannerBody color={headline}>Add a card for 14 extra days.</BannerBody>
          <TouchableOpacity
            onPress={() => router.push('/billing' as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 32,
              borderRadius: 8,
              backgroundColor: ctaColor,
            }}
          >
            <CreditCard size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Get 14 extra days</Text>
          </TouchableOpacity>
        </>
      )}
    </BannerShell>
  )
}

// ── building blocks ──

function BannerShell({ bg, border, children }: { bg: string; border: string; children: React.ReactNode }) {
  return (
    <View style={{
      marginHorizontal: 12,
      marginTop: 8,
      padding: 10,
      borderRadius: 10,
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: border,
    }}>
      {children}
    </View>
  )
}

function BannerHeader({
  color,
  icon,
  children,
}: {
  color: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      {icon}
      <Text style={{ fontSize: 12, fontWeight: '700', color }}>{children}</Text>
    </View>
  )
}

function BannerBody({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 11, color, opacity: 0.8, marginBottom: 8 }}>{children}</Text>
  )
}
