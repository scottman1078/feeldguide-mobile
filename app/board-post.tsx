import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MessageSquare, Send, Shield, MapPin, Clock } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/auth-context'
import { useRouter, useLocalSearchParams } from 'expo-router'

interface ResponseEntry {
  id: string
  pitch: string
  created_at: string
  therapist: {
    id: string
    full_name: string | null
    license_type: string | null
    location_city: string | null
    location_state: string | null
  } | null
}

export default function BoardPostDetailScreen() {
  const router = useRouter()
  const { postId } = useLocalSearchParams<{ postId: string }>()
  const { profile } = useAuth()
  const [post, setPost] = useState<any>(null)
  const [poster, setPoster] = useState<any>(null)
  const [responses, setResponses] = useState<ResponseEntry[]>([])
  const [loading, setLoading] = useState(1)
  const [responseText, setResponseText] = useState('')
  const [sending, setSending] = useState(0)
  const [sent, setSent] = useState(0)
  const [phiChecked, setPhiChecked] = useState(0)

  const fetchPost = useCallback(async () => {
    if (!postId) return
    const { data } = await supabase
      .from('fg_marketplace_posts')
      .select('*')
      .eq('id', postId)
      .single()
    if (data) {
      setPost(data)
      // Fetch poster profile
      if (data.posting_therapist_id) {
        const { data: p } = await supabase
          .from('fg_profiles')
          .select('id, full_name, license_type, location_city, location_state, avatar_url')
          .eq('id', data.posting_therapist_id)
          .single()
        if (p) setPoster(p)
      }
    }
    setLoading(0)
  }, [postId])

  useEffect(() => { fetchPost() }, [fetchPost])

  // When the viewer owns the post, load responses
  useEffect(() => {
    if (!post || !profile?.id) return
    if (post.posting_therapist_id !== profile.id) return

    let cancelled = false
    ;(async () => {
      const { data: raw } = await supabase
        .from('fg_marketplace_responses')
        .select('id, pitch, created_at, therapist_id')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false })

      if (!raw || raw.length === 0) {
        if (!cancelled) setResponses([])
        return
      }

      const therapistIds = [...new Set(raw.map((r: any) => r.therapist_id).filter(Boolean))]
      let therapistMap = new Map<string, any>()
      if (therapistIds.length > 0) {
        const { data: ts } = await supabase
          .from('fg_profiles')
          .select('id, full_name, license_type, location_city, location_state')
          .in('id', therapistIds)
        if (ts) therapistMap = new Map(ts.map((t: any) => [t.id, t]))
      }

      const mapped: ResponseEntry[] = raw.map((r: any) => ({
        id: r.id,
        pitch: r.pitch,
        created_at: r.created_at,
        therapist: therapistMap.get(r.therapist_id) || null,
      }))
      if (!cancelled) setResponses(mapped)
    })()

    return () => {
      cancelled = true
    }
  }, [post, profile?.id])

  const handleRespond = async () => {
    if (!responseText.trim() || !phiChecked || !profile?.id || !postId) return
    setSending(1)
    try {
      const { error } = await supabase.from('fg_marketplace_responses').insert({
        post_id: postId,
        therapist_id: profile.id,
        pitch: responseText.trim(),
      })
      if (error) {
        Alert.alert('Error', error.message)
      } else {
        setSent(1)
        setResponseText('')
      }
    } catch {
      Alert.alert('Error', 'Failed to send response')
    }
    setSending(0)
  }

  const handleMessagePoster = () => {
    if (poster) {
      router.push(`/conversation?userId=${poster.id}&userName=${encodeURIComponent(poster.full_name || '')}` as any)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.teal} />
      </SafeAreaView>
    )
  }

  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Post not found</Text>
      </SafeAreaView>
    )
  }

  const urgencyColor = post.urgency === 'crisis'
    ? { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }
    : post.urgency === 'urgent'
    ? { bg: '#fffbeb', text: '#d97706', border: '#fde68a' }
    : { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }

  const isOwnPost = post.posting_therapist_id === profile?.id

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Referral Post</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Client & Urgency */}
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          marginBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: colors.tealLight,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.teal }}>
                {post.client_initials || '??'}
              </Text>
            </View>
            <View style={{
              backgroundColor: urgencyColor.bg,
              borderWidth: 1,
              borderColor: urgencyColor.border,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: urgencyColor.text, textTransform: 'capitalize' }}>
                {post.urgency || 'routine'}
              </Text>
            </View>
          </View>

          {/* Description */}
          {post.description ? (
            <Text style={{ fontSize: 15, color: colors.textPrimary, lineHeight: 24, marginBottom: 16 }}>
              {post.description}
            </Text>
          ) : null}

          {/* Concerns */}
          {post.presenting_concerns && post.presenting_concerns.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {post.presenting_concerns.map((c: string, i: number) => (
                <View key={i} style={{
                  backgroundColor: colors.tealLight,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.teal }}>{c}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Details Row */}
          <View style={{ gap: 8 }}>
            {post.insurance_type ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Shield size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{post.insurance_type}</Text>
              </View>
            ) : null}
            {post.age_group ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Age group: {post.age_group}</Text>
            ) : null}
            {post.location_preference ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{post.location_preference}</Text>
              </View>
            ) : null}
            {post.preferred_modality ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Preferred: {post.preferred_modality}</Text>
            ) : null}
          </View>
        </View>

        {/* Posted By */}
        {poster ? (
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.tealLight,
              justifyContent: 'center', alignItems: 'center',
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.teal }}>
                {(poster.full_name || '').split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{poster.full_name}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{poster.license_type || 'Clinician'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{new Date(post.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        ) : null}

        {/* Action Buttons */}
        {!isOwnPost ? (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={handleMessagePoster}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.teal,
                borderRadius: 12,
                paddingVertical: 14,
              }}
            >
              <MessageSquare size={18} color={colors.teal} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.teal }}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/clinician?userId=${poster?.id}` as any)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>View Profile</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Responses list — visible to the post owner only */}
        {isOwnPost ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 }}>
              Responses ({responses.length})
            </Text>
            {responses.length === 0 ? (
              <View
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 20,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
                  No responses yet. You&apos;ll see them here when clinicians reach out.
                </Text>
              </View>
            ) : (
              responses.map((r) => {
                const name = r.therapist?.full_name || 'Clinician'
                const loc = [r.therapist?.location_city, r.therapist?.location_state].filter(Boolean).join(', ')
                const initials = name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                return (
                  <View
                    key={r.id}
                    style={{
                      backgroundColor: colors.white,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 16,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: colors.tealLight,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 10,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.teal }}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {r.therapist?.license_type || 'Clinician'}{loc ? ` · ${loc}` : ''}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 21, marginBottom: 10 }}>
                      {r.pitch}
                    </Text>
                    {r.therapist?.id ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() =>
                            router.push(
                              `/conversation?userId=${r.therapist!.id}&userName=${encodeURIComponent(name)}` as any
                            )
                          }
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            backgroundColor: colors.teal,
                            borderRadius: 10,
                            paddingVertical: 10,
                          }}
                        >
                          <MessageSquare size={14} color={colors.white} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white }}>Message</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => router.push(`/clinician?userId=${r.therapist!.id}` as any)}
                          style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: colors.white,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 10,
                            paddingVertical: 10,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>View Profile</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                )
              })
            )}
          </View>
        ) : null}

        {/* Respond Section */}
        {!isOwnPost && post.status === 'open' ? (
          sent ? (
            <View style={{
              backgroundColor: '#f0fdf4',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#bbf7d0',
              padding: 20,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#16a34a' }}>Response Sent!</Text>
              <Text style={{ fontSize: 13, color: '#4ade80', marginTop: 4 }}>The poster will be notified.</Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: colors.white,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>
                Respond to this Referral
              </Text>

              {/* PHI Disclaimer */}
              <View style={{
                backgroundColor: '#fffbeb',
                borderWidth: 1,
                borderColor: '#fde68a',
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <Shield size={16} color="#d97706" />
                <Text style={{ fontSize: 12, color: '#92400e', flex: 1, lineHeight: 18 }}>
                  Do not include patient names or identifying information in your response.
                </Text>
              </View>

              <MultilineInput
                value={responseText}
                onChangeText={setResponseText}
                placeholder="Describe your availability, experience, and why you'd be a good fit..."
              />

              {/* PHI Checkbox */}
              <TouchableOpacity
                onPress={() => setPhiChecked(phiChecked ? 0 : 1)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 4,
                  borderWidth: 2,
                  borderColor: phiChecked ? colors.teal : colors.border,
                  backgroundColor: phiChecked ? colors.teal : 'transparent',
                  justifyContent: 'center', alignItems: 'center',
                  marginTop: 2,
                }}>
                  {phiChecked ? (
                    <Text style={{ color: colors.white, fontSize: 14, fontWeight: '800' }}>✓</Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                  I confirm this response contains no HIPAA-protected health information
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRespond}
                disabled={!responseText.trim() || !phiChecked || sending ? true : false}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: colors.teal,
                  borderRadius: 12,
                  paddingVertical: 14,
                  opacity: !responseText.trim() || !phiChecked || sending ? 0.5 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Send size={18} color={colors.white} />
                )}
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>Submit Response</Text>
              </TouchableOpacity>
            </View>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

// Wrapper to safely pass multiline boolean to TextInput in New Architecture
function MultilineInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      {...{ multiline: true }}
      numberOfLines={4}
      style={{
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        padding: 14,
        fontSize: 14,
        color: colors.textPrimary,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 12,
      }}
    />
  )
}
