import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  Shield,
  Send,
  Sparkles,
  UserPlus,
  Handshake,
  CheckCircle2,
  Lightbulb,
  Plus,
} from 'lucide-react-native'
import { HeaderBar } from '../../src/components/header-bar'
import { colors } from '../../src/lib/colors'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/auth-context'

// ─── Types ───────────────────────────────────────────────

type FilterTab = 'all' | 'opportunities' | 'activity' | 'insights'
type BoardScope = 'all' | 'my-network' | 'my-posts'
type Urgency = 'routine' | 'urgent' | 'crisis'
type ActivityType = 'signup' | 'partnership' | 'referral_completed' | 'tip'

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
  response_count?: number
}

interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  actors: string[]
  created_at: string
}

type FeedItem =
  | { kind: 'opportunity'; created_at: string; data: ReferralOpportunity }
  | { kind: 'activity'; created_at: string; data: ActivityItem }

// ─── Constants ───────────────────────────────────────────

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'opportunities', label: 'Referral Board' },
  { value: 'activity', label: 'Activity' },
  { value: 'insights', label: 'Insights' },
]

const PLATFORM_TIPS = [
  'Complete your profile to appear higher in search results.',
  'Invite 3 colleagues to grow your network.',
  'Add your insurance panels to attract more referrals.',
  'Update your specialties to help others find you.',
  'Respond to referral opportunities to build your reputation.',
]

const ACTIVITY_META: Record<ActivityType, { Icon: typeof UserPlus; bg: string; text: string }> = {
  signup: { Icon: UserPlus, bg: '#eff6ff', text: '#2563eb' },
  partnership: { Icon: Handshake, bg: '#ecfdf5', text: '#059669' },
  referral_completed: { Icon: CheckCircle2, bg: '#ccfbf1', text: '#0d9488' },
  tip: { Icon: Lightbulb, bg: '#fef3c7', text: '#d97706' },
}

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
          justifyContent: post.response_count !== undefined ? 'space-between' : 'flex-end',
          alignItems: 'center',
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {post.response_count !== undefined ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: post.response_count > 0 ? colors.tealLight : colors.background,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: post.response_count > 0 ? colors.teal : colors.textMuted,
              }}
            >
              {post.response_count} {post.response_count === 1 ? 'response' : 'responses'}
            </Text>
          </View>
        ) : null}
        {post.status === 'open' && post.response_count === undefined ? (
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
        {post.response_count !== undefined ? (
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.teal }}>View →</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

// ─── Activity Card ───────────────────────────────────────

function ActivityCard({ item }: { item: ActivityItem }) {
  const meta = ACTIVITY_META[item.type]
  const Icon = meta.Icon

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: meta.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon size={16} color={meta.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 20 }}>
          {item.description}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>
    </View>
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
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [boardScope, setBoardScope] = useState<BoardScope>('all')
  const [opportunities, setOpportunities] = useState<ReferralOpportunity[]>([])
  const [myPosts, setMyPosts] = useState<ReferralOpportunity[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
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

  const fetchActivity = useCallback(async () => {
    const items: ActivityItem[] = []
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    try {
      const { data: signups } = await supabase
        .from('fg_profiles')
        .select('id, full_name, created_at')
        .eq('onboarding_completed', true)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10)

      if (signups) {
        for (const s of signups as any[]) {
          items.push({
            id: `signup-${s.id}`,
            type: 'signup',
            description: `${s.full_name || 'A new clinician'} joined FeeldGuide`,
            actors: [s.full_name || 'New member'],
            created_at: s.created_at,
          })
        }
      }

      const { data: partnerships } = await supabase
        .from('fg_partnerships')
        .select(
          'id, accepted_at, requester_id, recipient_id, requester:fg_profiles!fg_partnerships_requester_id_fkey ( full_name ), recipient:fg_profiles!fg_partnerships_recipient_id_fkey ( full_name )'
        )
        .eq('status', 'accepted')
        .gte('accepted_at', sevenDaysAgo)
        .order('accepted_at', { ascending: false })
        .limit(10)

      if (partnerships) {
        for (const p of partnerships as any[]) {
          const requester = p.requester?.full_name || 'Someone'
          const recipient = p.recipient?.full_name || 'someone'
          items.push({
            id: `partnership-${p.id}`,
            type: 'partnership',
            description: `${requester} and ${recipient} formed a partnership`,
            actors: [requester, recipient],
            created_at: p.accepted_at,
          })
        }
      }

      const { data: referrals } = await supabase
        .from('fg_referrals')
        .select(
          'id, updated_at, stage, sender_id, receiver_id, sender:fg_profiles!fg_referrals_sender_id_fkey ( full_name ), receiver:fg_profiles!fg_referrals_receiver_id_fkey ( full_name )'
        )
        .in('stage', ['completed', 'accepted'])
        .gte('updated_at', sevenDaysAgo)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (referrals) {
        for (const r of referrals as any[]) {
          const sender = r.sender?.full_name || 'Someone'
          const receiver = r.receiver?.full_name || 'someone'
          items.push({
            id: `referral-${r.id}`,
            type: 'referral_completed',
            description: `A referral between ${sender} and ${receiver} was ${r.stage}`,
            actors: [sender, receiver],
            created_at: r.updated_at,
          })
        }
      }

      const tipIndex = Math.floor(Math.random() * PLATFORM_TIPS.length)
      items.push({
        id: `tip-${tipIndex}`,
        type: 'tip',
        description: PLATFORM_TIPS[tipIndex],
        actors: [],
        created_at: new Date().toISOString(),
      })
      const tipIndex2 = (tipIndex + 2) % PLATFORM_TIPS.length
      items.push({
        id: `tip-${tipIndex2}`,
        type: 'tip',
        description: PLATFORM_TIPS[tipIndex2],
        actors: [],
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      })

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setActivities(items)
    } catch (err) {
      console.error('Failed to fetch activity:', err)
      setActivities([])
    }
  }, [])

  const fetchMyPosts = useCallback(async () => {
    if (!user?.id) {
      setMyPosts([])
      return
    }
    const { data } = await supabase
      .from('fg_marketplace_posts')
      .select(
        'id, client_initials, urgency, description, presenting_concerns, insurance_type, status, created_at, posting_therapist_id'
      )
      .eq('posting_therapist_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data || data.length === 0) {
      setMyPosts([])
      return
    }

    const postIds = data.map((p: any) => p.id)
    const { data: responses } = await supabase
      .from('fg_marketplace_responses')
      .select('post_id')
      .in('post_id', postIds)

    const countByPost: Record<string, number> = {}
    for (const r of (responses || []) as any[]) {
      countByPost[r.post_id] = (countByPost[r.post_id] || 0) + 1
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
      poster_name: 'You',
      poster_id: row.posting_therapist_id,
      response_count: countByPost[row.id] || 0,
    }))
    setMyPosts(mapped)
  }, [user?.id])

  const fetchConnections = useCallback(async () => {
    if (!user?.id) {
      setConnectedIds(new Set())
      return
    }
    const { data } = await supabase
      .from('fg_partnerships')
      .select('requester_id, recipient_id')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'accepted')
    const ids = new Set<string>()
    for (const p of (data || []) as any[]) {
      const other = p.requester_id === user.id ? p.recipient_id : p.requester_id
      if (other) ids.add(other)
    }
    setConnectedIds(ids)
  }, [user?.id])

  const loadAll = useCallback(async () => {
    await Promise.all([fetchOpportunities(), fetchActivity(), fetchConnections(), fetchMyPosts()])
  }, [fetchOpportunities, fetchActivity, fetchConnections, fetchMyPosts])

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

  const scopedOpportunities = useMemo(() => {
    if (boardScope === 'my-network') {
      return opportunities.filter((o) => connectedIds.has(o.poster_id))
    }
    if (boardScope === 'my-posts') {
      return myPosts
    }
    return opportunities
  }, [boardScope, opportunities, connectedIds, myPosts])

  const visibleData = useMemo<FeedItem[]>(() => {
    if (activeTab === 'insights') return []
    if (activeTab === 'opportunities') {
      return scopedOpportunities.map((o) => ({ kind: 'opportunity' as const, created_at: o.created_at, data: o }))
    }
    if (activeTab === 'activity') {
      return activities.map((a) => ({ kind: 'activity' as const, created_at: a.created_at, data: a }))
    }
    // 'all' → merge (full opportunities list, not scoped — All means everything)
    const merged: FeedItem[] = [
      ...opportunities.map((o) => ({ kind: 'opportunity' as const, created_at: o.created_at, data: o })),
      ...activities.map((a) => ({ kind: 'activity' as const, created_at: a.created_at, data: a })),
    ]
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return merged
  }, [activeTab, opportunities, scopedOpportunities, activities])

  const renderHeader = () => (
    <View style={{ paddingTop: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>Feed</Text>
        <TouchableOpacity
          onPress={() => router.push('/new-board-post' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.teal,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
          }}
        >
          <Plus size={14} color={colors.white} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.white }}>
            Post a Referral
          </Text>
        </TouchableOpacity>
      </View>

      {/* Primary filter tabs (horizontally scrollable) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        style={{ marginBottom: activeTab === 'opportunities' ? 10 : 16 }}
      >
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
      </ScrollView>

      {/* Sub-filter for Referral Board tab */}
      {activeTab === 'opportunities' ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 20,
            marginBottom: 16,
          }}
        >
          {(['all', 'my-network', 'my-posts'] as const).map((scope) => {
            const active = boardScope === scope
            const label =
              scope === 'all' ? 'All' : scope === 'my-network' ? 'My Network' : 'My Posts'
            return (
              <TouchableOpacity
                key={scope}
                onPress={() => setBoardScope(scope)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: active ? colors.textPrimary : colors.white,
                  borderWidth: 1,
                  borderColor: active ? colors.textPrimary : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: active ? colors.white : colors.textSecondary,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ) : null}

      {activeTab === 'insights' ? (
        <View style={{ paddingHorizontal: 20 }}>
          <InsightsPlaceholder />
        </View>
      ) : null}
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
    const message =
      activeTab === 'opportunities'
        ? boardScope === 'my-network'
          ? 'No open referrals from your network yet.'
          : boardScope === 'my-posts'
          ? "You haven't posted a referral yet. Tap Post a Referral to create one."
          : 'No open referral opportunities right now.'
        : activeTab === 'activity'
        ? 'No recent activity.'
        : 'Your feed is empty. Check back soon!'
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <EmptyState message={message} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />
      <FlatList
        data={visibleData}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 20 }}>
            {item.kind === 'opportunity' ? (
              <OpportunityCard post={item.data} onPress={() => handleOpportunityPress(item.data.id)} />
            ) : (
              <ActivityCard item={item.data} />
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />
        }
      />
    </View>
  )
}
