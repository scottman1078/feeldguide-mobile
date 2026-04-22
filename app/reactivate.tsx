import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CreditCard, AlertTriangle, Mail } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useAuth } from '../src/contexts/auth-context'
import { supabase } from '../src/lib/supabase'

/**
 * Reactivation screen for mobile — mirrors web /dashboard/reactivate.
 * Soft-lockout target for expired/canceled trials.
 */
export default function ReactivateScreen() {
  const { profile, signOut } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleAddCard() {
    setLoading(true)
    try {
      // Get a fresh JWT for the web API call.
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('No session')

      const res = await fetch('https://www.feeldguide.com/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ intent: 'reactivate' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Billing is not yet configured.')
      }
      await Linking.openURL(json.url)
    } catch (err) {
      Alert.alert(
        'Billing unavailable',
        err instanceof Error ? err.message : 'Please try again shortly.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
        <View style={{
          backgroundColor: '#FEF2F2',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#FECACA',
          padding: 20,
          marginBottom: 20,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={18} color="#B91C1C" />
            <Text style={{ color: '#B91C1C', fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>
              TRIAL ENDED
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
            Add a card to reactivate FeeldGuide. Your profile and connections are still saved.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleAddCard}
          disabled={loading}
          style={{
            height: 48,
            borderRadius: 12,
            backgroundColor: colors.teal,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <CreditCard size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {loading ? 'Opening checkout…' : 'Add card & reactivate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:support@feeldguide.com')}
          style={{
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 8,
          }}
        >
          <Mail size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Contact support</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={signOut}
          style={{ height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
