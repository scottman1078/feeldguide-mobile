import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  Shield,
  Send,
  Sparkles,
} from 'lucide-react-native'
import { HeaderBar } from '../../src/components/header-bar'
import { colors } from '../../src/lib/colors'
import { supabase } from '../../src/lib/supabase'

// ─── Types ───────────────────────────────────────────────

type FilterTab = 'all' | 'opportunities' | 'insights'
type Urgency = 'routine' | 'urgent' | 'crisis'

interface ReferralOpportunity {
  id: string
  client_initials: string
  urgency: Urgency
  description: string
  presenting_concerns: string[]
  insurance_type: string | null
  status: string
  created_at: string
  poster_name: string
  poster_id: string
}

// ─── Constants ───────────────────────────────────────────

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'insights', label: 'Insights' },
]

const URGENCY_META: Record<Urgency, { label: string; Icon: typeof Clock; bg: string; text: string; border: string }> = {
  routine: {
    label: 'Routine',
    Icon: Clock,
    bg: '#eff6ff',
    text: '#2563eb',
    border: '#bfdbfe',
  },
  urgent: {
    label: 'Urgent',
    Icon: AlertTriangle,
    bg: '#fffbeb',
    text: '#d97706',
    border: '#fde68a',
  },
  crisis: {
    label: 'Crisis',
    Icon: AlertCircle,
    bg: '#fef2f2',
    text: '#dc2626',
    border: '#fecaca',
  },
}

const INITIALS_COLORS: { bg: string; text: string }[] = [
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#ccfbf1', text: '#0d9488' },
  { bg: '#ffe4e6', text: '#e11d48' },
  { bg: '#e0f2fe', text: '#0284c7' },
  { bg: '#fef3c7', text: '#d97706' },
  { bg: '#d1fae5', text: '#059669' },
]

function hashIndex(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % INITIALS_COLORS.length
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter((p) => !p.startsWith('('))
    .map((p) => p.replace(/[^a-zA-Z]/g, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString()
}

// ─── Opportunity Card ────────────────────────────────────

function OpportunityCard({ post, onPress }: { post: ReferralOpportunity; onPress: () => void }) {
  const urgency = URGENCY_META[post.urgency] || URGENCY_META.routine
  const UrgencyIcon = urgency.Icon
  const posterPalette = INITIALS_COLORS[hashIndex(post.poster_name)]
  const clientPalette = INITIALS_COLORS[hashIndex(post.client_initials || 'XX')]

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: post.urgency === 'crisis' ? '#fecaca' : colors.border,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Poster row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: posterPalette.bg,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: posterPalette.text }}>
              {getInitials(post.poster_name)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
              {post.poster_name}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
              {formatRelativeTime(post.created_at)}
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: colors.tealLight,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.teal }}>Referral</Text>
        </View>
      </View>

      {/* Client initials + urgency */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: clientPalette.bg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: clientPalette.text }}>
            {post.client_initials}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: urgency.bg,
            borderWidth: 1,
            borderColor: urgency.border,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <UrgencyIcon size={11} color={urgency.text} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: urgency.text }}>{urgency.label}</Text>
        </View>
      </View>

      {/* Presenting concerns */}
      {post.presenting_concerns && post.presenting_concerns.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {post.presenting_concerns.slice(0, 6).map((c, i) => (
            <View
              key={`${c}-${i}`}
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Insurance */}
      {post.insurance_type ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Shield size={12} color={colors.textMuted} />
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{post.insurance_type}</Text>
        </View>
      ) : null}

      {/* Description */}
      {post.description ? (
        <Text
          style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 20, marginBottom: 12 }}
          numberOfLines={3}
        >
          {post.description}
        </Text>
      ) : null}

      {/* Footer */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {post.status === 'open' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: colors.teal,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Send size={12} color={colors.teal} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>Respond</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

// ─── Insights Placeholder ────────────────────────────────

function InsightsPlaceholder() {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.tealLight,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Sparkles size={26} color={colors.teal} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
        AI insights coming soon
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        We're building personalized intelligence from your referral patterns, network growth, and market signals. Check back after Insights launches.
      </Text>
    </View>
  )
}

// ─── Empty State ─────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>{message}</Text>
    </View>
  )
}

// ─── Main Feed Screen ────────────────────────────────────

export default function FeedScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [opportunities, setOpportunities] = useState<ReferralOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOpportunities = useCallback(async () => {
    const { data, error } = await supabase
      .from('fg_marketplace_posts')
      .select(
        'id, client_initials, urgency, description, presenting_concerns, insurance_type, status, created_at, posting_therapist_id'
      )
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !data) {
      setOpportunities([])
      return
    }

    const posterIds = [...new Set(data.map((p: any) => p.posting_therapist_id).filter(Boolean))]
    let nameMap = new Map<string, string>()
    if (posterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name')
        .in('id', posterIds)
      if (profiles) {
        nameMap = new Map(profiles.map((p: any) => [p.id, p.full_name]))
      }
    }

    const mapped: ReferralOpportunity[] = data.map((row: any) => ({
      id: row.id,
      client_initials: row.client_initials || '??',
      urgency: (row.urgency as Urgency) || 'routine',
      description: row.description || '',
      presenting_concerns: row.presenting_concerns || [],
      insurance_type: row.insurance_type,
      status: row.status,
      created_at: row.created_at,
      poster_name: nameMap.get(row.posting_therapist_id) || 'Clinician',
      poster_id: row.posting_therapist_id,
    }))
    setOpportunities(mapped)
  }, [])

  const loadAll = useCallback(async () => {
    await fetchOpportunities()
  }, [fetchOpportunities])

  useEffect(() => {
    setLoading(true)
    loadAll().finally(() => setLoading(false))
  }, [loadAll])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }, [loadAll])

  const handleOpportunityPress = useCallback(
    (id: string) => {
      router.push(`/board-post?postId=${id}` as any)
    },
    [router]
  )

  const visibleData = useMemo(() => {
    if (activeTab === 'insights') return []
    return opportunities
  }, [activeTab, opportunities])

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 }}>
        Feed
      </Text>

      {/* Filter tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.value
          return (
            <TouchableOpacity
              key={tab.value}
              onPress={() => setActiveTab(tab.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? colors.teal : colors.white,
                borderWidth: 1,
                borderColor: active ? colors.teal : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: active ? colors.white : colors.textSecondary,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {activeTab === 'insights' ? <InsightsPlaceholder /> : null}
    </View>
  )

  const renderEmpty = () => {
    if (activeTab === 'insights') return null
    if (loading) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      )
    }
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <EmptyState
          message={
            activeTab === 'opportunities'
              ? 'No open referral opportunities right now.'
              : 'No activity yet. Check back soon!'
          }
        />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />
      <FlatList
        data={visibleData}
        keyExtractor={(item) => `opp-${item.id}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 20 }}>
            <OpportunityCard post={item} onPress={() => handleOpportunityPress(item.id)} />
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />
        }
      />
    </View>
  )
}
