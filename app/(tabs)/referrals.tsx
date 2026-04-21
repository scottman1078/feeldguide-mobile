import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { Send, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native'
import { supabase } from '../../src/lib/supabase'
import { colors } from '../../src/lib/colors'
import { useAuth } from '../../src/contexts/auth-context'
import { HeaderBar } from '../../src/components/header-bar'

interface Referral {
  id: string
  from_therapist_id: string
  to_therapist_id: string
  client_initials: string | null
  presenting_concerns: string[] | null
  insurance_type: string | null
  urgency: string | null
  stage: string | null
  created_at: string
  otherName: string
}

const urgencyColors: Record<string, { bg: string; text: string }> = {
  high: { bg: '#fef2f2', text: '#dc2626' },
  medium: { bg: '#fffbeb', text: '#d97706' },
  low: { bg: '#f0fdf4', text: '#16a34a' },
}

const stageColors: Record<string, { bg: string; text: string }> = {
  new: { bg: '#dbeafe', text: '#2563eb' },
  contacted: { bg: '#e0e7ff', text: '#4f46e5' },
  scheduled: { bg: '#fef3c7', text: '#d97706' },
  accepted: { bg: '#dcfce7', text: '#16a34a' },
  declined: { bg: '#fef2f2', text: '#dc2626' },
  completed: { bg: '#f1f5f9', text: '#64748b' },
}

export default function ReferralsScreen() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent')

  const fetchReferrals = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('fg_referrals')
      .select('id, from_therapist_id, to_therapist_id, client_initials, presenting_concerns, insurance_type, urgency, stage, created_at')
      .or(`from_therapist_id.eq.${user.id},to_therapist_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      // Gather all "other" profile IDs
      const otherIds = [...new Set(data.map(r =>
        r.from_therapist_id === user.id ? r.to_therapist_id : r.from_therapist_id
      ))]

      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name')
        .in('id', otherIds)

      const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]) ?? [])

      const mapped: Referral[] = data.map(r => {
        const otherId = r.from_therapist_id === user.id ? r.to_therapist_id : r.from_therapist_id
        return {
          ...r,
          otherName: nameMap.get(otherId) ?? 'Unknown',
        }
      })

      setReferrals(mapped)
    } else {
      setReferrals([])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchReferrals()
  }, [fetchReferrals])

  const sentReferrals = referrals.filter(r => r.from_therapist_id === user?.id)
  const receivedReferrals = referrals.filter(r => r.to_therapist_id === user?.id)
  const activeList = activeTab === 'sent' ? sentReferrals : receivedReferrals

  const renderReferral = ({ item }: { item: Referral }) => {
    const isSent = item.from_therapist_id === user?.id
    const uColors = urgencyColors[item.urgency?.toLowerCase() ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' }
    const sColors = stageColors[item.stage?.toLowerCase() ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' }

    return (
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {isSent ? (
            <ArrowUpRight size={16} color={colors.teal} />
          ) : (
            <ArrowDownLeft size={16} color={colors.amber} />
          )}
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginLeft: 8, flex: 1 }}>
            {item.client_initials ?? 'N/A'}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 10 }}>
          {isSent ? 'To: ' : 'From: '}{item.otherName}
        </Text>

        {/* Badges row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {item.urgency ? (
            <View style={{
              backgroundColor: uColors.bg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: uColors.text }}>
                {item.urgency}
              </Text>
            </View>
          ) : null}
          {item.stage ? (
            <View style={{
              backgroundColor: sColors.bg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: sColors.text }}>
                {item.stage}
              </Text>
            </View>
          ) : null}
          {item.presenting_concerns?.map((concern, i) => (
            <View key={i} style={{
              backgroundColor: colors.tealLight,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.teal }}>
                {concern}
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>My Referrals</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Track referrals sent and received</Text>
      </View>

      {/* Sent / Received toggle */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 16,
        marginBottom: 12,
        gap: 8,
      }}>
        <TouchableOpacity
          onPress={() => setActiveTab('sent')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: activeTab === 'sent' ? colors.teal : colors.white,
            borderWidth: 1,
            borderColor: activeTab === 'sent' ? colors.teal : colors.border,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: activeTab === 'sent' ? colors.white : colors.textSecondary,
          }}>
            Sent ({sentReferrals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('received')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: activeTab === 'received' ? colors.teal : colors.white,
            borderWidth: 1,
            borderColor: activeTab === 'received' ? colors.teal : colors.border,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: activeTab === 'received' ? colors.white : colors.textSecondary,
          }}>
            Received ({receivedReferrals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={activeList}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Send size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16 }}>
                No {activeTab} referrals yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                Your referral pipeline will appear here
              </Text>
            </View>
          }
          renderItem={renderReferral}
        />
      )}
    </View>
  )
}
