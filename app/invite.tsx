import { View, Text, TouchableOpacity, Share, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Share2, Copy, UserPlus } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { useRouter } from 'expo-router'

export default function InviteScreen() {
  const { profile } = useAuth()
  const router = useRouter()

  const referralCode = profile?.id?.slice(0, 8) || 'invite'
  const inviteUrl = `https://feeldguide.com/join/${referralCode}`

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on FeeldGuide - the trusted clinician referral network. Sign up here: ${inviteUrl}`,
      })
    } catch {
      // user cancelled
    }
  }

  const handleCopy = async () => {
    // Use Share API as clipboard fallback (no expo-clipboard dependency)
    try {
      await Share.share({ message: inviteUrl })
    } catch {
      Alert.alert('Your invite link', inviteUrl)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Back header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginLeft: 12 }}>
          Invite Colleagues
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }}>
        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.tealLight,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <UserPlus size={32} color={colors.teal} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>
            Grow Your Network
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            Invite trusted colleagues to join FeeldGuide. Build a stronger referral network together.
          </Text>
        </View>

        {/* Link display */}
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Your invite link
          </Text>
          <Text style={{ fontSize: 14, color: colors.teal, fontWeight: '600' }}>
            {inviteUrl}
          </Text>
        </View>

        {/* Share button */}
        <TouchableOpacity
          onPress={handleShare}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.teal,
            borderRadius: 12,
            paddingVertical: 16,
            marginBottom: 12,
          }}
        >
          <Share2 size={18} color={colors.white} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white, marginLeft: 8 }}>
            Share Invite Link
          </Text>
        </TouchableOpacity>

        {/* Copy button */}
        <TouchableOpacity
          onPress={handleCopy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 16,
          }}
        >
          <Copy size={18} color={colors.teal} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.teal, marginLeft: 8 }}>
            Copy Link
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
