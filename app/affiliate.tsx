import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native'
import {
  Sparkles,
  Share2,
  TrendingUp,
  Users,
  DollarSign,
  Wallet,
} from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { supabase } from '../src/lib/supabase'
import { HeaderBar } from '../src/components/header-bar'

const API_BASE = 'https://www.feeldguide.com'

interface Referral {
  id: string
  agentName: string
  agentInitials: string
  signedUpAt: string | null
  memberSinceMonths: number
  monthlyRevenue: number
  monthlyCommission: number
  capRemainingMonths: number | null
  status: 'active' | 'free' | 'churned'
}

interface Payout {
  id: string
  totalAmount: number
  method: string
  status: string
  periodStart: string | null
  periodEnd: string | null
  notes: string | null
  createdAt: string
}

interface Earnings {
  isAffiliate: boolean
  shareUrl: string
  rate: number
  capMonths: number | null
  terms: string | null
  termsAcceptedAt: string | null
  totals: {
    activePayingReferrals: number
    totalReferrals: number
    thisMonthAccrual: number
    lifetimeAccrued: number
    lifetimePaid: number
  }
  referrals: Referral[]
  payouts: Payout[]
}

interface ConnectStatus {
  connected: boolean
  payoutsEnabled: boolean
}

async function authFetch(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const headers = new Headers(init.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}

export default function AffiliateScreen() {
  const [data, setData] = useState<Earnings | null>(null)
  const [connect, setConnect] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acceptingTerms, setAcceptingTerms] = useState(false)
  const [connectBusy, setConnectBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([
        authFetch('/api/affiliate/earnings'),
        authFetch('/api/affiliate/connect/status'),
      ])
      if (e.ok) setData(await e.json())
      if (c.ok) setConnect(await c.json())
    } catch (err) {
      console.error('[mobile/affiliate] load failed:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function shareLink() {
    if (!data?.shareUrl) return
    try {
      await Share.share({
        message: `Join me on FeeldGuide — ${data.shareUrl}`,
        url: data.shareUrl,
      })
    } catch {
      /* user dismissed */
    }
  }

  async function acceptTerms() {
    setAcceptingTerms(true)
    try {
      const res = await authFetch('/api/affiliate/accept-terms', { method: 'POST' })
      if (res.ok) await reload()
    } finally {
      setAcceptingTerms(false)
    }
  }

  async function startConnectOnboarding() {
    setConnectBusy(true)
    try {
      const res = await authFetch('/api/affiliate/connect/onboard', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.url) {
        await Linking.openURL(json.url)
      }
    } finally {
      setConnectBusy(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <HeaderBar />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.teal} />
        </View>
      </View>
    )
  }

  if (!data || !data.isAffiliate) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <HeaderBar />
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 14,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}>
            <Sparkles size={28} color={colors.teal} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginTop: 8 }}>
              You&apos;re not in the affiliate program yet
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              FeeldGuide&apos;s affiliate program is invite-only. Reach out to the team and we&apos;ll get you set up.
            </Text>
          </View>
        </View>
      </View>
    )
  }

  const t = data.totals
  const needsAcceptance = !data.termsAcceptedAt && !!data.terms

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              reload()
            }}
            tintColor={colors.teal}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 }}>
          <Sparkles size={22} color={colors.teal} />
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>
            Affiliate
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 14 }}>
          Earn {data.rate}% on every clinician you refer{data.capMonths ? ` for ${data.capMonths} months` : ''}.
        </Text>

        {needsAcceptance && (
          <View style={{
            backgroundColor: '#fffbeb',
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: '#fbbf24',
            marginBottom: 14,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 6 }}>
              Your affiliate terms
            </Text>
            <Text style={{ fontSize: 13, color: '#78350f', marginBottom: 10 }}>
              {data.terms}
            </Text>
            <TouchableOpacity
              onPress={acceptTerms}
              disabled={acceptingTerms}
              style={{
                backgroundColor: colors.teal,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                alignItems: 'center',
                opacity: acceptingTerms ? 0.6 : 1,
              }}
            >
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>
                I&apos;ve read &amp; agree
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Share link */}
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 14,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
            Your referral link
          </Text>
          <TextInput
            value={data.shareUrl}
            editable={false}
            selectTextOnFocus
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontFamily: 'Menlo',
              fontSize: 12,
              color: colors.textPrimary,
              backgroundColor: colors.background,
            }}
          />
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
            Long-press the link above to copy.
          </Text>
          <TouchableOpacity
            onPress={shareLink}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: colors.teal,
              marginTop: 10,
            }}
          >
            <Share2 size={16} color={colors.white} />
            <Text style={{ fontWeight: '700', fontSize: 14, color: colors.white }}>Share link</Text>
          </TouchableOpacity>
        </View>

        {/* Connect onboarding */}
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: connect?.payoutsEnabled ? colors.teal : colors.border,
          padding: 14,
          marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Wallet size={20} color={connect?.payoutsEnabled ? colors.teal : colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                  Payouts
                </Text>
                {connect?.payoutsEnabled && (
                  <View style={{ backgroundColor: colors.tealLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, color: colors.teal, fontWeight: '700' }}>VERIFIED</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {!connect?.connected
                  ? 'Connect a payout account to receive commissions via direct deposit.'
                  : !connect.payoutsEnabled
                    ? 'Stripe needs a few more details before payouts can start.'
                    : 'Stripe is verified — payouts will land in your bank account.'}
              </Text>
              <TouchableOpacity
                onPress={startConnectOnboarding}
                disabled={connectBusy}
                style={{
                  backgroundColor: connect?.payoutsEnabled ? colors.white : colors.teal,
                  borderWidth: connect?.payoutsEnabled ? 1 : 0,
                  borderColor: colors.border,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  alignSelf: 'flex-start',
                  marginTop: 10,
                  opacity: connectBusy ? 0.6 : 1,
                }}
              >
                <Text style={{
                  color: connect?.payoutsEnabled ? colors.textPrimary : colors.white,
                  fontWeight: '700',
                  fontSize: 13,
                }}>
                  {!connect?.connected
                    ? 'Set up Stripe payouts'
                    : !connect.payoutsEnabled
                      ? 'Continue Stripe onboarding'
                      : 'Update Stripe details'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stat grid */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <Stat label="Active paying" value={t.activePayingReferrals.toString()} Icon={TrendingUp} />
          <Stat label="Total" value={t.totalReferrals.toString()} Icon={Users} />
          <Stat label="This month" value={`$${t.thisMonthAccrual.toFixed(0)}`} Icon={DollarSign} />
          <Stat label="Lifetime" value={`$${(t.lifetimeAccrued + t.lifetimePaid).toFixed(0)}`} Icon={Wallet} />
        </View>

        {/* Referrals */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
          Referrals ({data.referrals.length})
        </Text>
        <View style={{ backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
          {data.referrals.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, padding: 16, textAlign: 'center' }}>
              No one has signed up via your link yet.
            </Text>
          ) : (
            data.referrals.map((r, idx) => (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: idx === data.referrals.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                  gap: 10,
                }}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.tealLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>{r.agentInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                    {r.agentName}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {r.status === 'active' ? `Active · $${r.monthlyRevenue}/mo` : r.status === 'churned' ? 'Churned' : 'Free'}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                  ${r.monthlyCommission.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Payouts */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
          Payout history ({data.payouts.length})
        </Text>
        <View style={{ backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
          {data.payouts.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, padding: 16, textAlign: 'center' }}>
              No payouts yet.
            </Text>
          ) : (
            data.payouts.map((p, idx) => (
              <View
                key={p.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: idx === data.payouts.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' }}>
                    {p.method.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                  ${p.totalAmount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function Stat({
  label,
  value,
  Icon,
}: {
  label: string
  value: string
  Icon: React.ComponentType<{ size?: number; color?: string }>
}) {
  return (
    <View style={{
      flex: 1,
      minWidth: '47%',
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{label}</Text>
        <Icon size={14} color={colors.teal} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 4 }}>
        {value}
      </Text>
    </View>
  )
}
