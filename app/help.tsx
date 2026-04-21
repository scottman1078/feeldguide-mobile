import { View, Text, TouchableOpacity, ScrollView, TextInput, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Search, ChevronDown, ChevronUp, Mail } from 'lucide-react-native'
import { colors } from '../src/lib/colors'
import { useRouter } from 'expo-router'
import { useState, useMemo } from 'react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSection {
  title: string
  items: FAQItem[]
}

const FAQ_DATA: FAQSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        question: 'What is FeeldGuide?',
        answer: 'FeeldGuide is a clinician network designed to help mental health professionals connect, refer clients, and grow their practice. We focus on trust-based referrals and professional collaboration.',
      },
      {
        question: 'How do I complete my profile?',
        answer: 'Go to Settings from the More tab to edit your profile information, practice details, session rates, and availability. A complete profile helps other clinicians find and refer clients to you.',
      },
      {
        question: 'How does the trust score work?',
        answer: 'Your trust score reflects your engagement and reliability within the network. It increases as you complete your profile, make and receive referrals, and maintain active connections with other clinicians.',
      },
      {
        question: 'What are the different membership tiers?',
        answer: 'FeeldGuide offers Free, Pro, and Elite tiers. Free members can connect and refer. Pro and Elite tiers unlock advanced features like priority referral placement, analytics, and expanded network visibility.',
      },
    ],
  },
  {
    title: 'Referrals',
    items: [
      {
        question: 'How do I send a referral?',
        answer: 'From the Referrals tab, tap "New Referral" and search for a clinician by specialty, location, or name. Fill in the client details and submit. The receiving clinician will be notified immediately.',
      },
      {
        question: 'How do I receive referrals?',
        answer: 'Ensure your profile is complete with your specialties, availability, and accepted insurance. Clinicians in your network will see you as a match when referring clients. You will receive notifications for new referrals in the Referrals tab.',
      },
      {
        question: 'Can I decline a referral?',
        answer: 'Yes. When you receive a referral, you can accept or decline it. If you decline, you can optionally suggest another clinician who may be a better fit for the client.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      {
        question: 'How do I change my password?',
        answer: 'Password changes are managed through the web platform. Visit feeldguide.com, sign in, and go to your account settings to update your password.',
      },
      {
        question: 'Can I update my email address?',
        answer: 'Email addresses are linked to your account and cannot be changed from the mobile app. Please contact support@feeldguide.com if you need to update your email.',
      },
      {
        question: 'How do I delete my account?',
        answer: 'To delete your account, please contact support@feeldguide.com. We will process your request and remove all associated data within 30 days, in compliance with our privacy policy.',
      },
    ],
  },
  {
    title: 'Privacy',
    items: [
      {
        question: 'Who can see my profile?',
        answer: 'Only verified clinicians within the FeeldGuide network can view your full profile. Your information is never shared with the public or used for advertising purposes.',
      },
      {
        question: 'Is client referral data secure?',
        answer: 'Yes. All referral data is encrypted in transit and at rest. We follow HIPAA-compliant practices to ensure client information shared during referrals is protected. Only the sending and receiving clinicians can view referral details.',
      },
    ],
  },
]

export default function HelpScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Record<string, number>>({})

  const toggleItem = (sectionIdx: number, itemIdx: number) => {
    const key = `${sectionIdx}-${itemIdx}`
    setExpandedItems(prev => ({
      ...prev,
      [key]: prev[key] ? 0 : 1,
    }))
  }

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_DATA
    const query = searchQuery.toLowerCase()
    return FAQ_DATA.map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      ),
    })).filter(section => section.items.length > 0)
  }, [searchQuery])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.white,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginLeft: 12 }}>
          Help Center
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {/* Search */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          marginTop: 20,
          marginBottom: 24,
        }}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search FAQs..."
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 10,
              fontSize: 15,
              color: colors.textPrimary,
            }}
          />
        </View>

        {/* FAQ Sections */}
        {filteredSections.map((section, sectionIdx) => (
          <View key={section.title} style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 10,
            }}>
              {section.title}
            </Text>

            <View style={{
              backgroundColor: colors.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}>
              {section.items.map((item, itemIdx) => {
                const key = `${sectionIdx}-${itemIdx}`
                const isExpanded = expandedItems[key] === 1
                const isLast = itemIdx === section.items.length - 1

                return (
                  <View key={key}>
                    <TouchableOpacity
                      onPress={() => toggleItem(sectionIdx, itemIdx)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                        borderBottomWidth: isLast && !isExpanded ? 0 : 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: '600',
                        color: colors.textPrimary,
                        paddingRight: 12,
                      }}>
                        {item.question}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={18} color={colors.textMuted} />
                      ) : (
                        <ChevronDown size={18} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>

                    {isExpanded ? (
                      <View style={{
                        paddingHorizontal: 16,
                        paddingBottom: 16,
                        paddingTop: 4,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: colors.border,
                        backgroundColor: '#f8fafc',
                      }}>
                        <Text style={{
                          fontSize: 14,
                          color: colors.textSecondary,
                          lineHeight: 22,
                        }}>
                          {item.answer}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )
              })}
            </View>
          </View>
        ))}

        {/* No results */}
        {filteredSections.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 16, color: colors.textMuted, textAlign: 'center' }}>
              No results found for "{searchQuery}"
            </Text>
          </View>
        ) : null}

        {/* Contact Section */}
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          marginTop: 8,
          marginBottom: 20,
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: 8,
          }}>
            Still need help?
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 16,
            lineHeight: 20,
          }}>
            We typically respond within 24 hours.
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:support@feeldguide.com')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.teal,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 24,
              width: '100%',
            }}
          >
            <Mail size={16} color={colors.white} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white, marginLeft: 8 }}>
              support@feeldguide.com
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
