import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Share,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Share2, Copy, Mail, MessageSquare, Send, UserPlus } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { useRouter } from 'expo-router'

export default function InviteScreen() {
  const { profile } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(0)

  const referralCode = (profile as any)?.referral_code || profile?.id?.slice(0, 8) || 'invite'
  const inviteUrl = `https://feeldguide.com/join/${referralCode}`
  const inviteMessage = `Join me on FeeldGuide — the trusted clinician referral network. Sign up here: ${inviteUrl}`

  const handleShare = async () => {
    try {
      await Share.share({
        message: inviteMessage,
        title: 'Join FeeldGuide',
      })
    } catch {
      // user cancelled
    }
  }

  const handleCopyLink = () => {
    Alert.alert('Invite Link', inviteUrl, [
      { text: 'Share', onPress: handleShare },
      { text: 'OK' },
    ])
  }

  const handleEmailInvite = async () => {
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await fetch('https://www.feeldguide.com/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: '',
          method: 'email',
        }),
      })
      if (res.ok) {
        setSent(1)
        setEmail('')
        setTimeout(() => setSent(0), 3000)
      } else {
        Alert.alert('Error', 'Failed to send invite. Try again.')
      }
    } catch {
      Alert.alert('Error', 'Network error. Try again.')
    } finally {
      setSending(false)
    }
  }

  const handleSMS = () => {
    const smsBody = encodeURIComponent(inviteMessage)
    Linking.openURL(`sms:&body=${smsBody}`)
  }

  const handleWhatsApp = () => {
    const waBody = encodeURIComponent(inviteMessage)
    Linking.openURL(`whatsapp://send?text=${waBody}`).catch(() => {
      Alert.alert('WhatsApp not installed')
    })
  }

  const handleEmailApp = () => {
    const subject = encodeURIComponent('Join me on FeeldGuide')
    const body = encodeURIComponent(inviteMessage)
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary }}>Invite Colleagues</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Hero */}
        <View style={{
          backgroundColor: colors.teal,
          borderRadius: 16,
          padding: 24,
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center', alignItems: 'center',
            marginBottom: 12,
          }}>
            <UserPlus size={28} color={colors.white} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.white, textAlign: 'center' }}>
            Grow Your Network
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
            Every colleague you invite adds their specialties and availability to the network.
          </Text>
        </View>

        {/* Email Invite */}
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>
            Invite by Email
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="colleague@practice.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                flex: 1,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                color: colors.textPrimary,
              }}
            />
            <TouchableOpacity
              onPress={handleEmailInvite}
              disabled={!email.trim() || sending ? true : false}
              style={{
                backgroundColor: colors.teal,
                borderRadius: 10,
                paddingHorizontal: 16,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: !email.trim() || sending ? 0.5 : 1,
              }}
            >
              {sending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Send size={18} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
          {sent ? (
            <Text style={{ fontSize: 12, color: colors.green, marginTop: 8, fontWeight: '600' }}>
              Invite sent!
            </Text>
          ) : null}
        </View>

        {/* Share Options */}
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>
            Share via
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { label: 'Text', Icon: MessageSquare, onPress: handleSMS, bg: '#dcfce7', fg: '#16a34a' },
              { label: 'Email', Icon: Mail, onPress: handleEmailApp, bg: '#dbeafe', fg: '#2563eb' },
              { label: 'Share', Icon: Share2, onPress: handleShare, bg: '#f3e8ff', fg: '#9333ea' },
              { label: 'Copy', Icon: Copy, onPress: handleCopyLink, bg: '#fef3c7', fg: '#d97706' },
            ].map(({ label, Icon, onPress, bg, fg }) => (
              <TouchableOpacity
                key={label}
                onPress={onPress}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: bg,
                }}
              >
                <Icon size={22} color={fg} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: fg, marginTop: 6 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Invite Link */}
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
            Your Invite Link
          </Text>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 10,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 13, color: colors.teal, fontWeight: '500' }} numberOfLines={1}>
              {inviteUrl}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
            Share this link with colleagues to invite them to FeeldGuide.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
