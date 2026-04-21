import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Send } from 'lucide-react-native'
import { supabase } from '../src/lib/supabase'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read_at: string | null
  created_at: string
}

interface PartnerProfile {
  full_name: string
  credentials: string | null
}

export default function ConversationScreen() {
  const { userId, userName } = useLocalSearchParams<{ userId?: string; userName?: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const flatListRef = useRef<FlatList>(null)

  const myId = user?.id

  // Fetch partner profile
  useEffect(() => {
    if (!userId) return
    const fetchPartner = async () => {
      const { data } = await supabase
        .from('fg_profiles')
        .select('full_name, credentials')
        .eq('id', userId)
        .single()
      if (data) {
        setPartner(data)
      }
    }
    fetchPartner()
  }, [userId])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!myId || !userId) return

    const { data } = await supabase
      .from('fg_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${myId})`
      )
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
    setLoading(false)
  }, [myId, userId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Mark messages as read when opening
  useEffect(() => {
    if (!myId || !userId) return
    const markRead = async () => {
      await supabase
        .from('fg_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', myId)
        .eq('sender_id', userId)
        .is('read_at', null)
    }
    markRead()
  }, [myId, userId])

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!myId || !userId) return

    const channel = supabase
      .channel(`messages-${myId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fg_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Only add if it's part of this conversation
          const isRelevant =
            (newMsg.sender_id === myId && newMsg.receiver_id === userId) ||
            (newMsg.sender_id === userId && newMsg.receiver_id === myId)
          if (isRelevant) {
            setMessages((prev) => [...prev, newMsg])
            // Mark as read if received
            if (newMsg.sender_id === userId) {
              supabase
                .from('fg_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', newMsg.id)
                .then()
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myId, userId])

  const handleSend = async () => {
    if (!messageText.trim() || !myId || !userId || sending) return

    const text = messageText.trim()
    setMessageText('')
    setSending(true)

    const { data, error } = await supabase
      .from('fg_messages')
      .insert({
        sender_id: myId,
        receiver_id: userId,
        content: text,
      })
      .select()
      .single()

    if (data && !error) {
      // Add locally if realtime doesn't catch it fast enough
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.id)
        return exists ? prev : [...prev, data]
      })
    }

    setSending(false)
  }

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true
    const current = new Date(messages[index].created_at).toDateString()
    const previous = new Date(messages[index - 1].created_at).toDateString()
    return current !== previous
  }

  const displayName = partner?.full_name || (userName ? decodeURIComponent(userName) : 'Conversation')
  const credentials = partner?.credentials

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.sender_id === myId
    const showDate = shouldShowDateSeparator(index)

    return (
      <View>
        {showDate ? (
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Text style={{
              fontSize: 12,
              color: colors.textMuted,
              fontWeight: '600',
              backgroundColor: colors.background,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              {formatDateSeparator(item.created_at)}
            </Text>
          </View>
        ) : null}
        <View
          style={{
            alignSelf: isMine ? 'flex-end' : 'flex-start',
            maxWidth: '78%',
            marginBottom: 6,
          }}
        >
          <View
            style={{
              backgroundColor: isMine ? colors.teal : colors.white,
              borderRadius: 18,
              borderTopRightRadius: isMine ? 4 : 18,
              borderTopLeftRadius: isMine ? 18 : 4,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: isMine ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                color: isMine ? colors.white : colors.textPrimary,
                lineHeight: 20,
              }}
            >
              {item.content}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 10,
              color: colors.textMuted,
              marginTop: 3,
              alignSelf: isMine ? 'flex-end' : 'flex-start',
              marginHorizontal: 4,
            }}
          >
            {formatTimestamp(item.created_at)}
          </Text>
        </View>
      </View>
    )
  }

  // No userId means "new message" flow — for now just show header
  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>
            New Message
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
            To start a new conversation, visit a clinician's profile and tap "Message".
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>
            {displayName}
          </Text>
          {credentials ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
              {credentials}
            </Text>
          ) : null}
        </View>
      </View>

      {/* PHI disclaimer */}
      <View
        style={{
          backgroundColor: colors.amber + '18',
          borderBottomWidth: 1,
          borderBottomColor: colors.amber + '30',
          paddingHorizontal: 16,
          paddingVertical: 6,
        }}
      >
        <Text style={{ fontSize: 11, color: colors.amber, fontWeight: '600', textAlign: 'center' }}>
          Do not include patient names or PHI in messages.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.teal} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 8,
              flexGrow: 1,
              justifyContent: messages.length === 0 ? 'center' : undefined,
            }}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false })
              }
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
                  No messages yet. Send the first one!
                </Text>
              </View>
            }
          />
        )}

        {/* Compose bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.white,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.background,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.textPrimary,
              maxHeight: 100,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            placeholder="Type a message (no patient names or PHI)..."
            placeholderTextColor={colors.textMuted}
            value={messageText}
            onChangeText={setMessageText}
            multiline={1 as any}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
            activeOpacity={0.7}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: messageText.trim() ? colors.teal : colors.border,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 8,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Send size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
