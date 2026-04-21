import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator,
  Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Send, ArrowDownLeft, ArrowUpRight, Plus, X, ChevronDown, AlertTriangle, Shield } from 'lucide-react-native'
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

interface ConnectionOption {
  id: string
  full_name: string
}

const urgencyColors: Record<string, { bg: string; text: string }> = {
  high: { bg: '#fef2f2', text: '#dc2626' },
  medium: { bg: '#fffbeb', text: '#d97706' },
  low: { bg: '#f0fdf4', text: '#16a34a' },
  routine: { bg: '#f0fdf4', text: '#16a34a' },
  urgent: { bg: '#fffbeb', text: '#d97706' },
  crisis: { bg: '#fef2f2', text: '#dc2626' },
}

const stageColors: Record<string, { bg: string; text: string }> = {
  referral_sent: { bg: '#dbeafe', text: '#2563eb' },
  new: { bg: '#dbeafe', text: '#2563eb' },
  contacted: { bg: '#e0e7ff', text: '#4f46e5' },
  scheduled: { bg: '#fef3c7', text: '#d97706' },
  accepted: { bg: '#dcfce7', text: '#16a34a' },
  declined: { bg: '#fef2f2', text: '#dc2626' },
  completed: { bg: '#f1f5f9', text: '#64748b' },
}

const STAGE_OPTIONS = ['referral_sent', 'contacted', 'scheduled', 'accepted', 'declined', 'completed']

const CONCERN_OPTIONS = [
  'Anxiety', 'Depression', 'Trauma/PTSD', 'Relationship Issues', 'Grief/Loss',
  'Substance Use', 'Eating Disorders', 'OCD', 'ADHD', 'Bipolar',
  'Personality Disorders', 'Child/Adolescent', 'Family Therapy', 'Other',
]

export default function ReferralsScreen() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent')
  const [showCreate, setShowCreate] = useState(false)
  const [stageDropdownId, setStageDropdownId] = useState<string | null>(null)

  // Create form state
  const [connections, setConnections] = useState<ConnectionOption[]>([])
  const [recipientSearch, setRecipientSearch] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<ConnectionOption | null>(null)
  const [clientInitials, setClientInitials] = useState('')
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([])
  const [urgency, setUrgency] = useState<'Routine' | 'Urgent' | 'Crisis'>('Routine')
  const [insuranceType, setInsuranceType] = useState('')
  const [notes, setNotes] = useState('')
  const [phiAcknowledged, setPhiAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchReferrals = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('fg_referrals')
      .select('id, from_therapist_id, to_therapist_id, client_initials, presenting_concerns, insurance_type, urgency, stage, created_at')
      .or(`from_therapist_id.eq.${user.id},to_therapist_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
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

  const fetchConnections = useCallback(async () => {
    if (!user) return
    const { data: connData } = await supabase
      .from('fg_connections')
      .select('id, requester_id, recipient_id')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (connData && connData.length > 0) {
      const otherIds = connData.map(c =>
        c.requester_id === user.id ? c.recipient_id : c.requester_id
      )
      const { data: profiles } = await supabase
        .from('fg_profiles')
        .select('id, full_name')
        .in('id', otherIds)

      if (profiles) {
        setConnections(profiles.map(p => ({ id: p.id, full_name: p.full_name })))
      }
    }
  }, [user])

  useEffect(() => {
    fetchReferrals()
    fetchConnections()
  }, [fetchReferrals, fetchConnections])

  const sentReferrals = referrals.filter(r => r.from_therapist_id === user?.id)
  const receivedReferrals = referrals.filter(r => r.to_therapist_id === user?.id)
  const activeList = activeTab === 'sent' ? sentReferrals : receivedReferrals

  // Stats: this month counts
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sentThisMonth = sentReferrals.filter(r => r.created_at >= monthStart).length
  const receivedThisMonth = receivedReferrals.filter(r => r.created_at >= monthStart).length

  const filteredRecipients = connections.filter(c => {
    if (!recipientSearch.trim()) return true
    return c.full_name.toLowerCase().includes(recipientSearch.toLowerCase())
  })

  const resetForm = () => {
    setSelectedRecipient(null)
    setRecipientSearch('')
    setClientInitials('')
    setSelectedConcerns([])
    setUrgency('Routine')
    setInsuranceType('')
    setNotes('')
    setPhiAcknowledged(false)
  }

  const handleCreateReferral = async () => {
    if (!user || !selectedRecipient) {
      Alert.alert('Missing Info', 'Please select a recipient.')
      return
    }
    if (!clientInitials.trim()) {
      Alert.alert('Missing Info', 'Please enter client initials.')
      return
    }
    if (!phiAcknowledged) {
      Alert.alert('PHI Acknowledgment', 'Please acknowledge the PHI disclaimer before submitting.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('fg_referrals').insert({
      from_therapist_id: user.id,
      to_therapist_id: selectedRecipient.id,
      client_initials: clientInitials.trim().toUpperCase(),
      presenting_concerns: selectedConcerns.length > 0 ? selectedConcerns : null,
      urgency: urgency,
      insurance_type: insuranceType.trim() || null,
      stage: 'referral_sent',
    })

    setSubmitting(false)

    if (error) {
      Alert.alert('Error', 'Failed to send referral. Please try again.')
    } else {
      setShowCreate(false)
      resetForm()
      fetchReferrals()
      Alert.alert('Referral Sent', `Referral sent to ${selectedRecipient.full_name}.`)
    }
  }

  const handleStageUpdate = async (referralId: string, newStage: string) => {
    setStageDropdownId(null)
    const { error } = await supabase
      .from('fg_referrals')
      .update({ stage: newStage })
      .eq('id', referralId)

    if (!error) {
      fetchReferrals()
    } else {
      Alert.alert('Error', 'Failed to update stage.')
    }
  }

  const toggleConcern = (concern: string) => {
    setSelectedConcerns(prev =>
      prev.includes(concern) ? prev.filter(c => c !== concern) : [...prev, concern]
    )
  }

  const renderReferral = ({ item }: { item: Referral }) => {
    const isSent = item.from_therapist_id === user?.id
    const uColors = urgencyColors[item.urgency?.toLowerCase() ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' }
    const sColors = stageColors[item.stage?.toLowerCase() ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' }
    const showDropdown = stageDropdownId === item.id

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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
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
            <TouchableOpacity
              onPress={() => setStageDropdownId(showDropdown ? null : item.id)}
              style={{
                backgroundColor: sColors.bg,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: sColors.text }}>
                {item.stage.replace(/_/g, ' ')}
              </Text>
              <ChevronDown size={10} color={sColors.text} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
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

        {/* Stage update dropdown */}
        {showDropdown ? (
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 10,
            padding: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, paddingLeft: 4 }}>
              Update Stage:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {STAGE_OPTIONS.map(stage => {
                const sc = stageColors[stage] ?? { bg: '#f1f5f9', text: '#64748b' }
                const isActive = item.stage === stage
                return (
                  <TouchableOpacity
                    key={stage}
                    onPress={() => handleStageUpdate(item.id, stage)}
                    style={{
                      backgroundColor: isActive ? sc.text : sc.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? '#fff' : sc.text }}>
                      {stage.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>My Referrals</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Track referrals sent and received</Text>
        </View>
        <TouchableOpacity
          onPress={() => { resetForm(); setShowCreate(true) }}
          style={{
            backgroundColor: colors.teal,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Plus size={16} color={colors.white} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white, marginLeft: 4 }}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 14, gap: 10 }}>
        <View style={{
          flex: 1,
          backgroundColor: colors.white,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.teal }}>{sentThisMonth}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>Sent This Month</Text>
        </View>
        <View style={{
          flex: 1,
          backgroundColor: colors.white,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.amber }}>{receivedThisMonth}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>Received This Month</Text>
        </View>
      </View>

      {/* Sent / Received toggle */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 14,
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

      {/* Create Referral Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Modal header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: colors.white,
            }}>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Send Referral</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {/* Recipient */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                Recipient *
              </Text>
              {selectedRecipient ? (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.tealLight,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.teal }}>
                    {selectedRecipient.full_name}
                  </Text>
                  <TouchableOpacity onPress={() => { setSelectedRecipient(null); setRecipientSearch('') }}>
                    <X size={18} color={colors.teal} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginBottom: 16 }}>
                  <TextInput
                    value={recipientSearch}
                    onChangeText={setRecipientSearch}
                    placeholder="Search your connections..."
                    placeholderTextColor={colors.textMuted}
                    style={{
                      backgroundColor: colors.white,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 15,
                      color: colors.textPrimary,
                    }}
                  />
                  {recipientSearch.trim().length > 0 ? (
                    <View style={{
                      backgroundColor: colors.white,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      marginTop: 4,
                      maxHeight: 160,
                    }}>
                      {filteredRecipients.length > 0 ? (
                        filteredRecipients.slice(0, 5).map(c => (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => { setSelectedRecipient(c); setRecipientSearch('') }}
                            style={{
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: colors.border,
                            }}
                          >
                            <Text style={{ fontSize: 14, color: colors.textPrimary }}>{c.full_name}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={{ padding: 12 }}>
                          <Text style={{ fontSize: 13, color: colors.textMuted }}>No connections found</Text>
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>
              )}

              {/* Client Initials */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                Client Initials *
              </Text>
              <TextInput
                value={clientInitials}
                onChangeText={t => setClientInitials(t.slice(0, 4))}
                placeholder="e.g. JD"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={{
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  color: colors.textPrimary,
                  marginBottom: 16,
                }}
              />

              {/* Presenting Concerns */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                Presenting Concerns
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {CONCERN_OPTIONS.map(concern => {
                  const isSelected = selectedConcerns.includes(concern)
                  return (
                    <TouchableOpacity
                      key={concern}
                      onPress={() => toggleConcern(concern)}
                      style={{
                        backgroundColor: isSelected ? colors.teal : colors.white,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.teal : colors.border,
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: isSelected ? colors.white : colors.textSecondary,
                      }}>
                        {concern}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Urgency */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                Urgency
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['Routine', 'Urgent', 'Crisis'] as const).map(u => {
                  const isActive = urgency === u
                  const uColor = u === 'Routine' ? colors.green : u === 'Urgent' ? colors.amber : colors.destructive
                  return (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setUrgency(u)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center',
                        backgroundColor: isActive ? uColor + '15' : colors.white,
                        borderWidth: 1,
                        borderColor: isActive ? uColor : colors.border,
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isActive ? uColor : colors.textSecondary,
                      }}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Insurance */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                Insurance Type
              </Text>
              <TextInput
                value={insuranceType}
                onChangeText={setInsuranceType}
                placeholder="e.g. Blue Cross, Medicaid, Self-pay"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  color: colors.textPrimary,
                  marginBottom: 16,
                }}
              />

              {/* Notes */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                Notes
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional context for the referral..."
                placeholderTextColor={colors.textMuted}
                multiline={true}
                numberOfLines={4}
                style={{
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  color: colors.textPrimary,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  marginBottom: 16,
                }}
              />

              {/* PHI Disclaimer */}
              <TouchableOpacity
                onPress={() => setPhiAcknowledged(!phiAcknowledged)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: phiAcknowledged ? colors.tealLight : colors.white,
                  borderWidth: 1,
                  borderColor: phiAcknowledged ? colors.teal + '40' : colors.border,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 20,
                }}
              >
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: phiAcknowledged ? colors.teal : colors.textMuted,
                  backgroundColor: phiAcknowledged ? colors.teal : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  marginTop: 1,
                }}>
                  {phiAcknowledged ? (
                    <Text style={{ color: colors.white, fontSize: 14, fontWeight: '700' }}>✓</Text>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Shield size={14} color={colors.amber} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginLeft: 6 }}>
                      PHI Acknowledgment
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
                    I acknowledge that I am sharing protected health information (PHI) and have the necessary consent to do so in accordance with HIPAA regulations.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleCreateReferral}
                disabled={submitting ? true : false}
                style={{
                  backgroundColor: colors.teal,
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: submitting ? 0.7 : 1,
                  marginBottom: 40,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white }}>Send Referral</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
